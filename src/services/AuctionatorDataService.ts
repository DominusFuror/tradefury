import { LocalStorageAPI } from './api';
import { ItemNameResolver } from './ItemNameResolver';
import { loadItemNameIndex, normalizeItemName } from './ItemNameIndex';

const STORAGE_KEY_VERSION = 1;

export interface AuctionatorParsedData {
  itemPrices: Map<number, number>;
  importedAt: string;
  source: string;
}

interface AuctionatorStoragePayload {
  version: number;
  source: string;
  importedAt: string;
  itemPrices: Record<number, number>;
}

const STORAGE_FALLBACK: AuctionatorParsedData = {
  itemPrices: new Map(),
  importedAt: new Date(0).toISOString(),
  source: 'Unknown'
};

const extractTableBlock = (content: string, tableName: string): string | null => {
  const startToken = `${tableName} = {`;
  const startIndex = content.indexOf(startToken);

  if (startIndex === -1) {
    return null;
  }

  let index = startIndex + startToken.length;
  let depth = 1;

  while (index < content.length && depth > 0) {
    const char = content[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
    index += 1;
  }

  if (depth !== 0) {
    return null;
  }

  return content.slice(startIndex, index);
};

const PRICE_KEY_PATTERNS = [
  /\["price"\]\s*=\s*([\d]+)/,
  /\["mr"\]\s*=\s*([\d]+)/,
  /\["minBuyout"\]\s*=\s*([\d]+)/,
  /\["marketValue"\]\s*=\s*([\d]+)/,
  /\["recent"\]\s*=\s*([\d]+)/,
  /\["historical"\]\s*=\s*([\d]+)/,
  /\["H\d+"\]\s*=\s*([\d]+)/ // historical spillover keys
] as const;

const parseLegacyPriceDatabase = (tableBlock: string): Map<number, number> => {
  const lines = tableBlock.split(/\r?\n/);
  const prices = new Map<number, number>();

  let currentItemId: number | null = null;
  let currentPrice: number | null = null;

  const commitEntry = () => {
    if (currentItemId !== null && currentPrice !== null) {
      prices.set(currentItemId, currentPrice);
    }
    currentItemId = null;
    currentPrice = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const idMatch = line.match(/\["is"\]\s*=\s*"(\d+):/);
    if (idMatch) {
      if (currentItemId !== null && currentPrice !== null) {
        commitEntry();
      }
      currentItemId = Number(idMatch[1]);
      continue;
    }

    for (const pattern of PRICE_KEY_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed) && parsed > 0) {
          currentPrice = parsed;
        }
        break;
      }
    }

    if (line.startsWith('},') || line === '}' || line === '}, --') {
      if (currentItemId !== null && currentPrice !== null) {
        commitEntry();
      } else {
        currentItemId = null;
        currentPrice = null;
      }
    }
  }

  if (currentItemId !== null && currentPrice !== null) {
    commitEntry();
  }

  return prices;
};

const extractBracketKeyValue = (
  line: string
): { key: string; rawValue: string } | null => {
  const match = line.match(/^\["([^"]+)"\]\s*=\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    key: match[1],
    rawValue: match[2]
  };
};

const parseNamedPriceDatabase = (tableBlock: string): Map<string, number> => {
  const lines = tableBlock.split(/\r?\n/);
  const prices = new Map<string, number>();

  let depth = 0;
  let currentRealm: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      depth += (rawLine.match(/{/g) || []).length;
      depth -= (rawLine.match(/}/g) || []).length;
      if (depth < 2) {
        currentRealm = null;
      }
      if (depth < 0) {
        depth = 0;
      }
      continue;
    }

    const openCount = (rawLine.match(/{/g) || []).length;
    const closeCount = (rawLine.match(/}/g) || []).length;

    const keyValue = extractBracketKeyValue(line);
    if (keyValue) {
      const { key, rawValue } = keyValue;

      if (rawValue.startsWith('{')) {
        if (depth === 1) {
          currentRealm = key;
        }
      } else if (depth >= 2 && currentRealm) {
        const priceMatch = rawValue.match(/(-?\d+)/);
        if (priceMatch) {
          const price = Number(priceMatch[1]);
          if (!Number.isNaN(price) && price > 0) {
            const existing = prices.get(key);
            if (existing === undefined || price < existing) {
              prices.set(key, price);
            }
          }
        }
      }
    }

    depth += openCount;
    depth -= closeCount;
    if (depth < 2) {
      currentRealm = null;
    }
    if (depth < 0) {
      depth = 0;
    }
  }

  return prices;
};

const toObject = (map: Map<number, number>): Record<number, number> => {
  const obj: Record<number, number> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};

const fromObject = (obj: Record<number, number>): Map<number, number> => {
  const map = new Map<number, number>();
  Object.entries(obj).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (!Number.isNaN(numericKey) && Number.isFinite(value)) {
      map.set(numericKey, value);
    }
  });
  return map;
};

const parsePricingHistoryIndex = (tableBlock: string): Map<string, number> => {
  const lines = tableBlock.split(/\r?\n/);
  const nameToId = new Map<string, number>();

  let depth = 0;
  let currentItemName: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      depth += (rawLine.match(/{/g) || []).length;
      depth -= (rawLine.match(/}/g) || []).length;
      if (depth <= 1) {
        currentItemName = null;
      }
      if (depth < 0) {
        depth = 0;
      }
      continue;
    }

    const openCount = (rawLine.match(/{/g) || []).length;
    const closeCount = (rawLine.match(/}/g) || []).length;

    const itemStartMatch = line.match(/^\["([^"]+)"\]\s*=\s*{\s*,?\s*$/);
    if (itemStartMatch) {
      currentItemName = itemStartMatch[1];
    } else if (currentItemName && line.startsWith('["is"]')) {
      const idMatch = line.match(/\["is"\]\s*=\s*"(\d+):/);
      if (idMatch) {
        const itemId = Number(idMatch[1]);
        if (!Number.isNaN(itemId)) {
          nameToId.set(normalizeItemName(currentItemName), itemId);
        }
      }
    }

    depth += openCount;
    depth -= closeCount;
    if (depth <= 1) {
      currentItemName = null;
    }
    if (depth < 0) {
      depth = 0;
    }
  }

  return nameToId;
};

const mapNamePricesToItemIds = (
  namePrices: Map<string, number>,
  itemNameIndex: Map<string, number>,
  historyIndex: Map<string, number>
): {
  prices: Map<number, number>;
  unknownNames: Set<string>;
  resolvedViaHistory: number;
  resolvedNames: Map<string, number>;
} => {
  const prices = new Map<number, number>();
  const unknownNames = new Set<string>();
  let resolvedViaHistory = 0;
  const resolvedNames = new Map<string, number>();

  namePrices.forEach((price, name) => {
    const normalized = normalizeItemName(name);
    let itemId = itemNameIndex.get(normalized);

    if (itemId === undefined) {
      itemId = historyIndex.get(normalized);
      if (itemId !== undefined) {
        resolvedViaHistory += 1;
        itemNameIndex.set(normalized, itemId);
      }
    }

    if (itemId === undefined) {
      unknownNames.add(name);
      return;
    }

    resolvedNames.set(name, itemId);

    const existing = prices.get(itemId);
    if (existing === undefined || price < existing) {
      prices.set(itemId, price);
    }
  });

  return { prices, unknownNames, resolvedViaHistory, resolvedNames };
};

export const AuctionatorDataService = {
  async parse(content: string, sourceLabel: string): Promise<AuctionatorParsedData> {
    const priceBlock = extractTableBlock(content, 'AUCTIONATOR_PRICE_DATABASE');
    if (!priceBlock) {
      throw new Error('Failed to locate AUCTIONATOR_PRICE_DATABASE in provided file.');
    }

    const namePrices = parseNamedPriceDatabase(priceBlock);

    const historyBlock = extractTableBlock(content, 'AUCTIONATOR_PRICING_HISTORY');
    const historyIndex = historyBlock
      ? parsePricingHistoryIndex(historyBlock)
      : new Map<string, number>();

    const itemNameIndex = await loadItemNameIndex();
    const resolved = mapNamePricesToItemIds(namePrices, itemNameIndex, historyIndex);
    ItemNameResolver.prime(resolved.resolvedNames);
    ItemNameResolver.queueIdResolution(resolved.prices.keys());

    const unresolvedNames = new Set(resolved.unknownNames);
    let itemPrices = resolved.prices;
    let resolvedViaWowhead = 0;

    if (unresolvedNames.size > 0) {
      const wowheadMatches = await ItemNameResolver.resolveMany(unresolvedNames);
      if (wowheadMatches.size > 0) {
        wowheadMatches.forEach((itemId: number, originalName: string) => {
          const price = namePrices.get(originalName);
          if (price === undefined) {
            return;
          }

          const existing = itemPrices.get(itemId);
          if (existing === undefined || price < existing) {
            itemPrices.set(itemId, price);
          }

          const normalized = normalizeItemName(originalName);
          if (normalized) {
            itemNameIndex.set(normalized, itemId);
          }

          unresolvedNames.delete(originalName);
          resolvedViaWowhead += 1;
        });

        if (wowheadMatches.size > 0) {
          ItemNameResolver.prime(wowheadMatches);
          ItemNameResolver.queueIdResolution(wowheadMatches.values());
        }
      }
    }

    if (itemPrices.size === 0) {
      itemPrices = parseLegacyPriceDatabase(priceBlock);
      if (itemPrices.size > 0) {
        ItemNameResolver.queueIdResolution(itemPrices.keys());
      }
    }

    if (resolved.resolvedViaHistory > 0) {
      console.info(
        `[Auctionator] Resolved ${resolved.resolvedViaHistory} item(s) via pricing history fallback.`
      );
    }

    if (resolvedViaWowhead > 0) {
      console.info(`[Auctionator] Resolved ${resolvedViaWowhead} item(s) via Wowhead lookup.`);
    }

    if (unresolvedNames.size > 0) {
      const sample = Array.from(unresolvedNames).slice(0, 10);
      console.warn(
        `[Auctionator] Unable to resolve ${unresolvedNames.size} items from Auctionator.lua`,
        sample
      );
    }

    if (itemPrices.size === 0) {
      console.warn('Auctionator parser did not find any price entries in AUCTIONATOR_PRICE_DATABASE.');
    } else {
      console.info(`[Auctionator] Loaded ${itemPrices.size} price entries from ${sourceLabel}`);
    }

    return {
      itemPrices,
      importedAt: new Date().toISOString(),
      source: sourceLabel
    };
  },

  save(data: AuctionatorParsedData): void {
    const payload: AuctionatorStoragePayload = {
      version: STORAGE_KEY_VERSION,
      source: data.source,
      importedAt: data.importedAt,
      itemPrices: toObject(data.itemPrices)
    };

    LocalStorageAPI.saveAuctionatorData(payload);
  },

  load(): AuctionatorParsedData | null {
    try {
      const raw = LocalStorageAPI.getAuctionatorData() as AuctionatorStoragePayload | null;
      if (!raw || !raw.itemPrices) {
        return null;
      }

      return {
        itemPrices: fromObject(raw.itemPrices),
        importedAt: raw.importedAt || STORAGE_FALLBACK.importedAt,
        source: raw.source || STORAGE_FALLBACK.source
      };
    } catch (error) {
      console.error('Failed to load Auctionator price data from storage', error);
      return null;
    }
  },

  clear(): void {
    LocalStorageAPI.clearAuctionatorData();
  }
};
