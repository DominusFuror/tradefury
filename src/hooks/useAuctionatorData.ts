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

const SHARED_STORAGE_ENABLED = false; // Always use server storage

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
    let cancelled = false;

    const loadData = async () => {
      try {
        const data = await AuctionatorDataService.load();
        if (!cancelled && data) {
          setFromParsedData(data);
        }
      } catch (err) {
        console.error('Failed to load Auctionator data', err);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
    // intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelection = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const parsed = await AuctionatorDataService.parse(content, file.name);
      const existing = await AuctionatorDataService.load();
      const merged = AuctionatorDataService.mergeWithExisting(existing, parsed);
      await AuctionatorDataService.save(merged);
      setFromParsedData(merged);
    } catch (err) {
      console.error('Failed to parse Auctionator.lua file', err);
      setError('Failed to parse Auctionator.lua. Please ensure you selected a valid Auctionator file.');
    } finally {
      setIsLoading(false);
    }
  }, [setFromParsedData]);

  const clear = useCallback(async () => {
    try {
      await AuctionatorDataService.clear();
    } catch (err) {
      console.error('Failed to clear Auctionator data', err);
    }
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
