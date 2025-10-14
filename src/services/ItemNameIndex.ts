import Papa from 'papaparse';

const ITEM_FILE = 'Item.csv';
const ITEM_NAME_OVERRIDE_FILE = 'itemsidnames/items_new.csv';

const ITEM_NAME_KEYS = [
  'Name_lang_ruRU',
  'Name_Lang_ruRU',
  'Name_lang_enUS',
  'Name_Lang_enUS',
  'Name_lang_enGB',
  'Name_Lang_enGB',
  'Name_lang',
  'Name_Lang'
] as const;

interface ItemRow {
  ID: string;
  [key: string]: string | undefined;
}

interface ItemOverrideRow {
  id: string;
  name: string;
}

type ItemNameIndex = Map<string, number>;
type ItemIdNameMap = Map<number, string>;

let cachedIndex: ItemNameIndex | null = null;
let inflightIndexPromise: Promise<ItemNameIndex> | null = null;

let cachedOverrides: ItemIdNameMap | null = null;
let inflightOverridePromise: Promise<ItemIdNameMap> | null = null;

const normalizePath = (value: string): string => value.replace(/\/{2,}/g, '/');

const buildRelativeDbPath = (fileName: string): string =>
  normalizePath(`${process.env.PUBLIC_URL || ''}/db/${fileName}`);

const getDbFileUrl = (fileName: string): string => {
  if (typeof window !== 'undefined' && window.location) {
    return new URL(buildRelativeDbPath(fileName), window.location.origin).toString();
  }

  return buildRelativeDbPath(fileName);
};

const parseNumber = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseString = (value?: string | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeItemName = (name: string): string =>
  name
    .replace(/\|c[0-9a-fA-F]{8}/g, '')
    .replace(/\|r/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const createOverrideMap = async (): Promise<ItemIdNameMap> =>
  new Promise<ItemIdNameMap>((resolve) => {
    const overrides: ItemIdNameMap = new Map();

    Papa.parse<ItemOverrideRow>(getDbFileUrl(ITEM_NAME_OVERRIDE_FILE), {
      download: true,
      header: true,
      skipEmptyLines: true,
      worker: true,
      step: (stepResult) => {
        const { id, name } = stepResult.data;
        const parsedId = parseNumber(id);
        const parsedName = parseString(name);
        if (parsedId === null || !parsedName) {
          return;
        }

        overrides.set(parsedId, parsedName);
      },
      complete: () => resolve(overrides),
      error: (error) => {
        console.warn('[Auctionator] Failed to load items_new.csv overrides', error);
        resolve(overrides);
      }
    });
  });

export const loadItemIdToNameMap = async (): Promise<ItemIdNameMap> => {
  if (cachedOverrides) {
    return cachedOverrides;
  }

  if (!inflightOverridePromise) {
    inflightOverridePromise = createOverrideMap()
      .then((map) => {
        cachedOverrides = map;
        return map;
      })
      .catch((error) => {
        inflightOverridePromise = null;
        throw error;
      });
  }

  return inflightOverridePromise;
};

const createItemNameIndex = async (): Promise<ItemNameIndex> => {
  const overrides = await loadItemIdToNameMap();

  return new Promise<ItemNameIndex>((resolve, reject) => {
    const index: ItemNameIndex = new Map();
    const collisions = new Map<string, Set<number>>();

    const applyName = (name: string, id: number) => {
      const normalized = normalizeItemName(name);
      if (!normalized) {
        return;
      }

      const existingId = index.get(normalized);
      if (existingId === undefined) {
        index.set(normalized, id);
        return;
      }

      if (existingId === id) {
        return;
      }

      if (!collisions.has(normalized)) {
        collisions.set(normalized, new Set([existingId]));
      }
      collisions.get(normalized)?.add(id);
    };

    Papa.parse<ItemRow>(getDbFileUrl(ITEM_FILE), {
      download: true,
      header: true,
      skipEmptyLines: true,
      worker: true,
      step: (stepResult) => {
        const row = stepResult.data;
        const id = parseNumber(row.ID);
        if (id === null) {
          return;
        }

        const overrideName = overrides.get(id);
        if (overrideName) {
          applyName(overrideName, id);
        }

        for (const key of ITEM_NAME_KEYS) {
          const parsed = parseString(row[key]);
          if (parsed) {
            applyName(parsed, id);
          }
        }
      },
      complete: () => {
        overrides.forEach((name, id) => {
          applyName(name, id);
        });

        if (collisions.size > 0) {
          const sample = Array.from(collisions.entries())
            .slice(0, 5)
            .map(([name, ids]) => ({
              name,
              ids: Array.from(ids).sort()
            }));
          console.warn(
            `[Auctionator] Detected ${collisions.size} item name collisions when building index`,
            sample
          );
        }

        resolve(index);
      },
      error: (error) => reject(error)
    });
  });
};

export const loadItemNameIndex = async (): Promise<ItemNameIndex> => {
  if (cachedIndex) {
    return cachedIndex;
  }

  if (!inflightIndexPromise) {
    inflightIndexPromise = createItemNameIndex()
      .then((index) => {
        cachedIndex = index;
        return index;
      })
      .catch((error) => {
        inflightIndexPromise = null;
        throw error;
      });
  }

  return inflightIndexPromise;
};

export const registerNameMapping = (name: string, itemId: number): void => {
  const normalized = normalizeItemName(name);
  if (!normalized) {
    return;
  }

  if (cachedOverrides && !cachedOverrides.has(itemId)) {
    cachedOverrides.set(itemId, name);
  }

  if (cachedIndex && cachedIndex.get(normalized) !== itemId) {
    cachedIndex.set(normalized, itemId);
  }
};
