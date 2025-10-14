import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuctionatorDataService, AuctionatorParsedData } from '../services/AuctionatorDataService';

export interface AuctionatorMetadata {
  source: string;
  importedAt: string;
  itemCount: number;
}

export const useAuctionatorData = () => {
  const [priceMap, setPriceMap] = useState<Map<number, number> | null>(null);
  const [metadata, setMetadata] = useState<AuctionatorMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setFromParsedData = useCallback((parsed: AuctionatorParsedData) => {
    setPriceMap(new Map(parsed.itemPrices));
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
      AuctionatorDataService.save(parsed);
      setFromParsedData(parsed);
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
    setMetadata(null);
    setError(null);
  }, []);

  const hasData = useMemo(() => Boolean(priceMap && priceMap.size > 0), [priceMap]);

  return {
    priceMap,
    metadata,
    hasData,
    error,
    isLoading,
    handleFileSelection,
    clear
  };
};
