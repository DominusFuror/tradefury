import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuctionatorDataService,
  AuctionatorParsedData,
  PriceHistoryEntry
} from '../services/AuctionatorDataService';

export interface AuctionatorMetadata {
  source: string;
  importedAt: string;
  itemCount: number;
}

export const useAuctionatorData = () => {
  const [priceMap, setPriceMap] = useState<Map<number, number> | null>(null);
  const [priceHistory, setPriceHistory] = useState<Map<number, PriceHistoryEntry[]> | null>(null);
  const [metadata, setMetadata] = useState<AuctionatorMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setFromParsedData = useCallback((parsed: AuctionatorParsedData) => {
    const history = new Map(parsed.itemPrices);
    const latest = new Map<number, number>();

    history.forEach((entries, itemId) => {
      if (entries.length > 0) {
        latest.set(itemId, entries[entries.length - 1].price);
      }
    });

    setPriceHistory(history);
    setPriceMap(latest);
    setMetadata({
      source: parsed.source,
      importedAt: parsed.importedAt,
      itemCount: parsed.itemPrices.size
    });
    setError(null);
  }, []);

  useEffect(() => {
    const stored = AuctionatorDataService.load();
    if (stored) {
      setFromParsedData(stored);
    }
    // intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelection = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const parsed = await AuctionatorDataService.parse(content, file.name);
      const existing = AuctionatorDataService.load();
      const merged = AuctionatorDataService.mergeWithExisting(existing, parsed);
      AuctionatorDataService.save(merged);
      setFromParsedData(merged);
    } catch (err) {
      console.error('Failed to parse Auctionator.lua file', err);
      setError('Failed to parse Auctionator.lua. Please ensure you selected a valid Auctionator file.');
    } finally {
      setIsLoading(false);
    }
  }, [setFromParsedData]);

  const clear = useCallback(() => {
    AuctionatorDataService.clear();
    setPriceMap(null);
    setPriceHistory(null);
    setMetadata(null);
    setError(null);
  }, []);

  const hasData = useMemo(() => Boolean(priceMap && priceMap.size > 0), [priceMap]);

  return {
    priceMap,
    priceHistory,
    metadata,
    hasData,
    error,
    isLoading,
    handleFileSelection,
    clear
  };
};
