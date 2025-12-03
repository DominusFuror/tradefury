import { PersistentStorage } from './api';
import { ItemNameResolver } from './ItemNameResolver';
import { loadItemNameIndex, normalizeItemName } from './ItemNameIndex';
import { SharedStorageClient } from './SharedStorageClient';
import { decodeHtmlEntities } from '../utils/html';

const STORAGE_KEY_VERSION = 2;
const HISTORY_LIMIT = 50;

export interface PriceHistoryEntry {
  price: number;
  importedAt: string;
  source: string;
}

export interface AuctionatorParsedData {
  itemPrices: Map<number, PriceHistoryEntry[]>;
  importedAt: string;
  source: string;
}

interface RawHistoryRecord {
  key: number;
  totalPrice: number;
  quantity: number;
}

interface PricingHistoryParseResult {
  index: Map<string, number>;
  entriesByItemId: Map<number, RawHistoryRecord[]>;
  maxKey: number | null;
}

interface AuctionatorStoragePayloadV1 {
  version: number;
  source: string;
  importedAt: string;
  itemPrices: Record<number, number>;
}

interface AuctionatorStoragePayloadV2 {
  version: number;
  source: string;
  importedAt: string;
  itemPrices: Record<number, PriceHistoryEntry[]>;
}

type AuctionatorStoragePayload = AuctionatorStoragePayloadV1 | AuctionatorStoragePayloadV2;

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
            const decodedKey = decodeHtmlEntities(key);
            const existing = prices.get(decodedKey);
            if (existing === undefined || price < existing) {
              prices.set(decodedKey, price);
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

const toHistoryObject = (map: Map<number, PriceHistoryEntry[]>): Record<number, PriceHistoryEntry[]> => {
  const obj: Record<number, PriceHistoryEntry[]> = {};
  map.forEach((value, key) => {
    obj[key] = [...value];
  });
  return obj;
};

const fromHistoryObject = (obj: Record<number, PriceHistoryEntry[]>): Map<number, PriceHistoryEntry[]> => {
  const map = new Map<number, PriceHistoryEntry[]>();
  Object.entries(obj).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (!Number.isNaN(numericKey) && Array.isArray(value)) {
      const sanitized = value
        .filter((entry) => Number.isFinite(entry?.price) && typeof entry?.importedAt === 'string')
        .map((entry) => ({
          price: Number(entry.price),
          importedAt: entry.importedAt,
          source: entry.source ?? 'Unknown'
        }))
        .sort((a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime());
      map.set(numericKey, sanitized.slice(-HISTORY_LIMIT));
    }
  });
  return map;
};

const createHistoryEntry = (price: number, importedAt: string, source: string): PriceHistoryEntry => ({
  price,
  importedAt,
  source
});

const createStoragePayload = (data: AuctionatorParsedData): AuctionatorStoragePayloadV2 => ({
  version: STORAGE_KEY_VERSION,
  source: data.source,
  importedAt: data.importedAt,
  itemPrices: toHistoryObject(data.itemPrices)
});

const parseStoragePayload = (raw: AuctionatorStoragePayload | null): AuctionatorParsedData | null => {
  if (!raw || !raw.itemPrices) {
    return null;
  }

  if (raw.version <= 1) {
    const legacy = raw as AuctionatorStoragePayloadV1;
    const history = new Map<number, PriceHistoryEntry[]>();
    Object.entries(legacy.itemPrices).forEach(([id, priceValue]) => {
      const numericId = Number(id);
      const numericPrice = Number(priceValue);
      if (!Number.isNaN(numericId) && Number.isFinite(numericPrice)) {
        history.set(numericId, [
          createHistoryEntry(
            numericPrice,
            legacy.importedAt || STORAGE_FALLBACK.importedAt,
            legacy.source || STORAGE_FALLBACK.source
          )
        ]);
      }
    });

    return {
      itemPrices: history,
      importedAt: legacy.importedAt || STORAGE_FALLBACK.importedAt,
      source: legacy.source || STORAGE_FALLBACK.source
    };
  }

  const v2 = raw as AuctionatorStoragePayloadV2;

  return {
    itemPrices: fromHistoryObject(v2.itemPrices),
    importedAt: v2.importedAt || STORAGE_FALLBACK.importedAt,
    source: v2.source || STORAGE_FALLBACK.source
  };
};

const extractLastScanTime = (content: string): number | null => {
  const match = content.match(/AUCTIONATOR_LAST_SCAN_TIME\s*=\s*(\d+)/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const parsePricingHistoryData = (tableBlock: string): PricingHistoryParseResult => {
  const lines = tableBlock.split(/\r?\n/);
  const index = new Map<string, number>();
  const entriesByItemId = new Map<number, RawHistoryRecord[]>();

  let depth = 0;
  let currentItemName: string | null = null;
  let currentNormalizedName: string | null = null;
  let currentItemId: number | null = null;
  let pendingEntries: RawHistoryRecord[] = [];
  let maxKey: number | null = null;

  const commitCurrent = () => {
    if (currentNormalizedName && currentItemId !== null) {
      index.set(currentNormalizedName, currentItemId);
      if (pendingEntries.length > 0) {
        const existing = entriesByItemId.get(currentItemId) ?? [];
        entriesByItemId.set(currentItemId, existing.concat(pendingEntries));
      }
    }

    currentItemName = null;
    currentNormalizedName = null;
    currentItemId = null;
    pendingEntries = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const openCount = (rawLine.match(/{/g) || []).length;
    const closeCount = (rawLine.match(/}/g) || []).length;

    if (!line) {
      depth += openCount;
      depth -= closeCount;
      if (depth < 2 && currentItemName) {
        commitCurrent();
      }
      if (depth < 0) {
        depth = 0;
      }
      continue;
    }

    const itemStartMatch = line.match(/^\["([^"]+)"\]\s*=\s*{\s*,?\s*$/);
    if (itemStartMatch && depth === 1) {
      commitCurrent();
      const decoded = decodeHtmlEntities(itemStartMatch[1]);
      currentItemName = decoded;
      currentNormalizedName = normalizeItemName(decoded);
      depth += openCount;
      depth -= closeCount;
      if (depth < 0) {
        depth = 0;
      }
      continue;
    }

    if (currentItemName) {
      const keyValue = extractBracketKeyValue(line);

      if (keyValue && keyValue.key === 'is') {
        const idMatch = keyValue.rawValue.match(/"(\d+):/);
        if (idMatch) {
          const parsedId = Number(idMatch[1]);
          if (!Number.isNaN(parsedId)) {
            currentItemId = parsedId;
            if (currentNormalizedName) {
              index.set(currentNormalizedName, parsedId);
            }
          }
        }
      } else if (keyValue && /^\d+$/.test(keyValue.key)) {
        const keyNumber = Number(keyValue.key);
        if (Number.isFinite(keyNumber)) {
          const valueWithoutComment = keyValue.rawValue.split('--')[0].trim();
          const sanitized = valueWithoutComment.replace(/[},]$/, '').trim();
          const valueMatch = sanitized.match(/^"([^"]+)"/);
          if (valueMatch) {
            const [pricePart, quantityPart] = valueMatch[1].split(':');
            const totalPrice = Number(pricePart);
            const quantity = Number(quantityPart ?? '1');
            if (Number.isFinite(totalPrice) && totalPrice > 0) {
              const record: RawHistoryRecord = {
                key: keyNumber,
                totalPrice,
                quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
              };
              pendingEntries.push(record);
              if (maxKey === null || keyNumber > maxKey) {
                maxKey = keyNumber;
              }
            }
          }
        }
      }
    }

    depth += openCount;
    depth -= closeCount;
    if (depth < 2 && currentItemName) {
      commitCurrent();
    }
    if (depth < 0) {
      depth = 0;
    }
  }

  commitCurrent();

  return {
    index,
    entriesByItemId,
    maxKey
  };
};

const convertRawHistoryToEntries = (
  rawHistory: Map<number, RawHistoryRecord[]>,
  source: string,
  anchorTimestamp?: number,
  maxKeyOverride: number | null = null
): Map<number, PriceHistoryEntry[]> => {
  const history = new Map<number, PriceHistoryEntry[]>();
  let globalMaxKey: number | null = maxKeyOverride;

  if (globalMaxKey === null) {
    rawHistory.forEach((records) => {
      records.forEach((record) => {
        if (globalMaxKey === null || record.key > globalMaxKey) {
          globalMaxKey = record.key;
        }
      });
    });
  }

  const anchorSeconds = anchorTimestamp ?? Math.floor(Date.now() / 1000);

  rawHistory.forEach((records, itemId) => {
    const sortedRecords = [...records].sort((a, b) => a.key - b.key);
    const entries: PriceHistoryEntry[] = [];

    sortedRecords.forEach(({ key, totalPrice, quantity }) => {
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
        return;
      }

      const perItemPrice = Math.round(totalPrice / Math.max(quantity, 1));
      if (!Number.isFinite(perItemPrice) || perItemPrice <= 0) {
        return;
      }

      let importedAtSeconds = anchorSeconds;
      if (globalMaxKey !== null) {
        const deltaMinutes = globalMaxKey - key;
        importedAtSeconds = anchorSeconds - deltaMinutes * 60;
      }

      const importedAt = new Date(Math.max(importedAtSeconds, 0) * 1000).toISOString();
      const duplicate = entries.find(
        (entry) => entry.price === perItemPrice && entry.importedAt === importedAt
      );

      if (!duplicate) {
        entries.push(createHistoryEntry(perItemPrice, importedAt, source));
      }
    });

    entries.sort(
      (a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime()
    );

    if (entries.length > HISTORY_LIMIT) {
      history.set(itemId, entries.slice(-HISTORY_LIMIT));
    } else if (entries.length > 0) {
      history.set(itemId, entries);
    }
  });

  return history;
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
    const decodedName = decodeHtmlEntities(name);
    const normalized = normalizeItemName(decodedName);
    let itemId = itemNameIndex.get(normalized);

    if (itemId === undefined) {
      itemId = historyIndex.get(normalized);
      if (itemId !== undefined) {
        resolvedViaHistory += 1;
        itemNameIndex.set(normalized, itemId);
      }
    }

    if (itemId === undefined) {
      unknownNames.add(decodedName);
      return;
    }

    resolvedNames.set(decodedName, itemId);

    const existing = prices.get(itemId);
    if (existing === undefined || price < existing) {
      prices.set(itemId, price);
    }
  });

  return { prices, unknownNames, resolvedViaHistory, resolvedNames };
};

const mergeHistories = (
  existing: Map<number, PriceHistoryEntry[]>,
  incoming: Map<number, PriceHistoryEntry[]>,
  limit = HISTORY_LIMIT
): Map<number, PriceHistoryEntry[]> => {
  const result = new Map<number, PriceHistoryEntry[]>();

  existing.forEach((entries, itemId) => {
    result.set(itemId, [...entries]);
  });

  incoming.forEach((entries, itemId) => {
    if (entries.length === 0) {
      return;
    }

    const updates = result.get(itemId) ?? [];
    entries.forEach((entry) => {
      const duplicate = updates.find(
        (existingEntry) =>
          existingEntry.importedAt === entry.importedAt && existingEntry.price === entry.price
      );
      if (!duplicate) {
        updates.push(entry);
      }
    });

    updates.sort(
      (a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime()
    );
    result.set(itemId, updates.slice(-limit));
  });

  return result;
};

export const AuctionatorDataService = {
  async parse(content: string, sourceLabel: string): Promise<AuctionatorParsedData> {
    const priceBlock = extractTableBlock(content, 'AUCTIONATOR_PRICE_DATABASE');
    const historyBlock = extractTableBlock(content, 'AUCTIONATOR_PRICING_HISTORY');

    if (!priceBlock && !historyBlock) {
      throw new Error(
        'Auctionator.lua does not contain AUCTIONATOR_PRICE_DATABASE or AUCTIONATOR_PRICING_HISTORY sections.'
      );
    }

    if (!priceBlock) {
      console.warn(
        `[Auctionator] AUCTIONATOR_PRICE_DATABASE not found in ${sourceLabel}. Proceeding with pricing history only.`
      );
    }

    const namePrices = priceBlock ? parseNamedPriceDatabase(priceBlock) : new Map<string, number>();

    const historyData = historyBlock ? parsePricingHistoryData(historyBlock) : null;
    const historyIndex = historyData?.index ?? new Map<string, number>();
    const rawHistory = historyData?.entriesByItemId ?? new Map<number, RawHistoryRecord[]>();
    const historyMaxKey = historyData?.maxKey ?? null;
    const lastScanTime = extractLastScanTime(content);

    const itemNameIndex = await loadItemNameIndex();
    const resolved = mapNamePricesToItemIds(namePrices, itemNameIndex, historyIndex);
    ItemNameResolver.prime(resolved.resolvedNames);
    // ItemNameResolver.queueIdResolution(resolved.prices.keys());

    const unresolvedNames = new Set(resolved.unknownNames);
    let itemPrices = resolved.prices;
    let resolvedViaWowhead = 0;

    // Disabled Wowhead lookups - they cause thousands of CORS-blocked requests
    // if (unresolvedNames.size > 0) {
    //   const wowheadMatches = await ItemNameResolver.resolveMany(unresolvedNames);
    //   if (wowheadMatches.size > 0) {
    //     wowheadMatches.forEach((itemId: number, originalName: string) => {
    //       const price = namePrices.get(originalName);
    //       if (price === undefined) {
    //         return;
    //       }

    //       const existing = itemPrices.get(itemId);
    //       if (existing === undefined || price < existing) {
    //         itemPrices.set(itemId, price);
    //       }

    //       const normalized = normalizeItemName(originalName);
    //       if (normalized) {
    //         itemNameIndex.set(normalized, itemId);
    //       }

    //       unresolvedNames.delete(originalName);
    //       resolvedViaWowhead += 1;
    //     });

    //     if (wowheadMatches.size > 0) {
    //       ItemNameResolver.prime(wowheadMatches);
    //       ItemNameResolver.queueIdResolution(wowheadMatches.values());
    //     }
    //   }
    // }

    if (itemPrices.size === 0 && priceBlock) {
      itemPrices = parseLegacyPriceDatabase(priceBlock);
      // if (itemPrices.size > 0) {
      //   ItemNameResolver.queueIdResolution(itemPrices.keys());
      // }
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

    const anchorTimestamp = lastScanTime ?? Math.floor(Date.now() / 1000);
    const importedAt = new Date(anchorTimestamp * 1000).toISOString();
    const historyFromFile = convertRawHistoryToEntries(
      rawHistory,
      sourceLabel,
      anchorTimestamp,
      historyMaxKey
    );

    if (historyFromFile.size > 0) {
      // ItemNameResolver.queueIdResolution(Array.from(historyFromFile.keys()));
      console.info(
        `[Auctionator] Loaded pricing history for ${historyFromFile.size} item(s) from ${sourceLabel}`
      );
    }

    const history = new Map<number, PriceHistoryEntry[]>();
    historyFromFile.forEach((entries, itemId) => {
      history.set(itemId, [...entries]);
    });

    if (itemPrices.size > 0) {
      itemPrices.forEach((price, itemId) => {
        const existingEntries = history.get(itemId) ? [...history.get(itemId)!] : [];
        const latestEntry = createHistoryEntry(price, importedAt, sourceLabel);
        const duplicate = existingEntries.find(
          (entry) => entry.price === latestEntry.price && entry.importedAt === latestEntry.importedAt
        );
        if (!duplicate) {
          existingEntries.push(latestEntry);
          existingEntries.sort(
            (a, b) => new Date(a.importedAt).getTime() - new Date(b.importedAt).getTime()
          );
        }
        history.set(itemId, existingEntries.slice(-HISTORY_LIMIT));
      });
    }

    return {
      itemPrices: history,
      importedAt,
      source: sourceLabel
    };
  },

  async save(data: AuctionatorParsedData): Promise<void> {
    const payload = createStoragePayload(data);
    try {
      await PersistentStorage.saveAuctionatorData(payload);
    } catch (error) {
      console.error('Failed to persist Auctionator price data locally', error);
    }
  },

  async load(): Promise<AuctionatorParsedData | null> {
    try {
      const raw = (await PersistentStorage.getAuctionatorData()) as
        | AuctionatorStoragePayload
        | null;
      return parseStoragePayload(raw);
    } catch (error) {
      console.error('Failed to load Auctionator price data from storage', error);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await PersistentStorage.clearAuctionatorData();
    } catch (error) {
      console.warn('Failed to clear Auctionator price data', error);
    }
  },

  mergeWithExisting(
    existing: AuctionatorParsedData | null,
    incoming: AuctionatorParsedData
  ): AuctionatorParsedData {
    if (!existing) {
      return incoming;
    }

    const mergedHistory = mergeHistories(existing.itemPrices, incoming.itemPrices, HISTORY_LIMIT);
    return {
      itemPrices: mergedHistory,
      importedAt: incoming.importedAt,
      source: incoming.source
    };
  },

  mergePreferRecent(
    first: AuctionatorParsedData | null,
    second: AuctionatorParsedData | null
  ): AuctionatorParsedData | null {
    if (!first && !second) {
      return null;
    }
    if (!first) {
      return second;
    }
    if (!second) {
      return first;
    }

    const firstTime = new Date(first.importedAt).getTime();
    const secondTime = new Date(second.importedAt).getTime();
    const firstValid = Number.isFinite(firstTime);
    const secondValid = Number.isFinite(secondTime);

    if (!firstValid && !secondValid) {
      return this.mergeWithExisting(first, second);
    }

    if (!firstValid) {
      return this.mergeWithExisting(first, second);
    }

    if (!secondValid) {
      return this.mergeWithExisting(second, first);
    }

    if (secondTime >= firstTime) {
      return this.mergeWithExisting(first, second);
    }

    return this.mergeWithExisting(second, first);
  },


};
