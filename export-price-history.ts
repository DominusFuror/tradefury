import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

interface PriceHistoryEntry {
  price: number;
  importedAt: string;
  source: string;
}

interface AuctionatorPayloadV1 {
  version: number;
  source?: string;
  importedAt?: string;
  itemPrices: Record<number, number>;
}

interface AuctionatorPayloadV2 {
  version: number;
  source?: string;
  importedAt?: string;
  itemPrices: Record<number, PriceHistoryEntry[]>;
}

type AuctionatorPayload = AuctionatorPayloadV1 | AuctionatorPayloadV2;

type OverrideRow = {
  id: string;
  name: string;
  [key: string]: string | undefined;
};

const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'price-history-export.json');
const ITEMS_NEW = path.resolve(__dirname, 'public', 'db', 'itemsidnames', 'items_new.csv');
const ITEMS_FROM_CRAFTING = path.resolve(
  __dirname,
  'public',
  'db',
  'itemsidnames',
  'items_from_crafting.csv'
);

const loadOverrideFile = (filePath: string, map: Map<number, string>) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse<OverrideRow>(content, {
    header: true,
    skipEmptyLines: true
  });

  parsed.data.forEach((row) => {
    const id = Number(row.id);
    const name = row.name?.trim();
    if (!Number.isNaN(id) && name) {
      map.set(id, name);
    }
  });
};

const loadNameOverrides = (): Map<number, string> => {
  const overrides = new Map<number, string>();
  loadOverrideFile(ITEMS_NEW, overrides);
  loadOverrideFile(ITEMS_FROM_CRAFTING, overrides);
  return overrides;
};

const normalizeOutputEntries = (
  itemPrices: Map<number, PriceHistoryEntry[]>,
  overrides: Map<number, string>
) => {
  const items: Array<{ id: number; name: string; history: PriceHistoryEntry[] }> = [];

  itemPrices.forEach((entries, itemId) => {
    items.push({
      id: itemId,
      name: overrides.get(itemId) ?? Item #,
      history: entries
    });
  });

  return items.sort((a, b) => a.id - b.id);
};

const parsePayload = (payload: AuctionatorPayload): {
  itemPrices: Map<number, PriceHistoryEntry[]>;
  importedAt: string;
  source: string;
} => {
  if (payload.version <= 1) {
    const legacy = payload as AuctionatorPayloadV1;
    const history = new Map<number, PriceHistoryEntry[]>();
    Object.entries(legacy.itemPrices).forEach(([id, price]) => {
      const numericId = Number(id);
      const numericPrice = Number(price);
      if (!Number.isNaN(numericId) && Number.isFinite(numericPrice)) {
        history.set(numericId, [
          {
            price: numericPrice,
            importedAt: legacy.importedAt ?? new Date(0).toISOString(),
            source: legacy.source ?? 'Unknown'
          }
        ]);
      }
    });
    return {
      itemPrices: history,
      importedAt: legacy.importedAt ?? new Date(0).toISOString(),
      source: legacy.source ?? 'Unknown'
    };
  }

  const v2 = payload as AuctionatorPayloadV2;
  const history = new Map<number, PriceHistoryEntry[]>();
  Object.entries(v2.itemPrices).forEach(([id, entries]) => {
    const numericId = Number(id);
    if (!Number.isNaN(numericId) && Array.isArray(entries)) {
      history.set(numericId, entries);
    }
  });

  return {
    itemPrices: history,
    importedAt: v2.importedAt ?? new Date(0).toISOString(),
    source: v2.source ?? 'Unknown'
  };
};

const main = async () => {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : DEFAULT_OUTPUT;

  if (!inputPath) {
    console.error('Usage: ts-node export-price-history.ts <path-to-wow-auctionator-price-data.json> [output.json]');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(Unable to find input file: );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as AuctionatorPayload;
  const parsed = parsePayload(raw);
  const overrides = loadNameOverrides();

  const items = normalizeOutputEntries(parsed.itemPrices, overrides);

  const payload = {
    source: parsed.source,
    importedAt: parsed.importedAt,
    exportedAt: new Date().toISOString(),
    totalItems: items.length,
    items
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(Price history exported to );
};

main().catch((error) => {
  console.error('Failed to export price history', error);
  process.exit(1);
});

