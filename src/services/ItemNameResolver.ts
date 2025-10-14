import { LocalStorageAPI } from './api';
import { normalizeItemName, registerNameMapping } from './ItemNameIndex';

export interface ItemNameResolutionListener {
  (entry: { id: number; name: string }): void;
}

interface CacheState {
  nameToId: Map<string, number>;
  idToName: Map<number, string>;
}

const WOWHEAD_ITEM_XML_URL = 'https://www.wowhead.com/wotlk/item=';
const WOWHEAD_SEARCH_XML_URL = 'https://www.wowhead.com/wotlk/search?q=';
const MAX_CONCURRENT_XML_REQUESTS = 3;

let cacheState: CacheState | null = null;
let persistScheduled = false;
let pendingIds: Set<number> = new Set();
let activeRequests = 0;
let queueScheduled = false;

const listeners = new Set<ItemNameResolutionListener>();

const ensureCache = (): CacheState => {
  if (!cacheState) {
    const stored = LocalStorageAPI.getItemNameCache();
    cacheState = {
      nameToId: new Map(
        Object.entries(stored.nameToId).map(([key, value]) => [key, value])
      ),
      idToName: new Map(
        Object.entries(stored.idToName).map(([key, value]) => [Number(key), value])
      )
    };
  }

  return cacheState;
};

const schedulePersist = (): void => {
  if (persistScheduled) {
    return;
  }

  persistScheduled = true;

  const persist = () => {
    persistScheduled = false;
    if (!cacheState) {
      return;
    }

    const payload = {
      nameToId: Object.fromEntries(cacheState.nameToId),
      idToName: Object.fromEntries(cacheState.idToName)
    };

    try {
      LocalStorageAPI.saveItemNameCache(payload);
    } catch (error) {
      console.warn('Failed to persist item name cache', error);
    }
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as typeof window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
      persist
    );
  } else {
    setTimeout(persist, 0);
  }
};

const notifyListeners = (entry: { id: number; name: string }): void => {
  listeners.forEach((listener) => {
    try {
      listener(entry);
    } catch (error) {
      console.warn('ItemNameResolver listener threw an error', error);
    }
  });
};

const storeMapping = (name: string, itemId: number, shouldPersist: boolean): boolean => {
  const normalized = normalizeItemName(name);
  if (!normalized) {
    return false;
  }

  const cache = ensureCache();
  const existingId = cache.nameToId.get(normalized);
  const existingName = cache.idToName.get(itemId);
  const isNewMapping = existingId !== itemId || existingName !== name;

  cache.nameToId.set(normalized, itemId);
  cache.idToName.set(itemId, name);
  registerNameMapping(name, itemId);

  if (isNewMapping) {
    if (shouldPersist) {
      schedulePersist();
    }
    notifyListeners({ id: itemId, name });
  }

  return isNewMapping;
};

const fetchXml = async (url: string): Promise<Document | null> => {
  if (typeof fetch === 'undefined' || typeof DOMParser === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache'
    });
    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(text, 'application/xml');
  } catch (error) {
    console.warn('Failed to fetch Wowhead XML', url, error);
    return null;
  }
};

const fetchItemXml = async (itemId: number): Promise<string | null> => {
  const xml = await fetchXml(`${WOWHEAD_ITEM_XML_URL}${itemId}&xml`);
  if (!xml) {
    return null;
  }

  const nameNode = xml.querySelector('item > name');
  const localizedNode = xml.querySelector('item > name_' + (xml.documentElement.getAttribute('lang') ?? ''));

  if (nameNode?.textContent?.trim()) {
    return nameNode.textContent.trim();
  }

  if (localizedNode?.textContent?.trim()) {
    return localizedNode.textContent.trim();
  }

  return null;
};

const fetchSearchResults = async (
  query: string
): Promise<Array<{ id: number; name: string }>> => {
  const xml = await fetchXml(`${WOWHEAD_SEARCH_XML_URL}${encodeURIComponent(query)}&xml`);
  if (!xml) {
    return [];
  }

  const items: Array<{ id: number; name: string }> = [];
  xml.querySelectorAll('item').forEach((node) => {
    const idAttr = node.getAttribute('id');
    const name = node.textContent?.trim() ?? '';
    if (!idAttr || !name) {
      return;
    }

    const id = Number(idAttr);
    if (Number.isNaN(id)) {
      return;
    }

    items.push({ id, name });
  });

  return items;
};

const pickBestSearchMatch = (
  query: string,
  candidates: Array<{ id: number; name: string }>
): { id: number; name: string } | null => {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeItemName(query);

  const exact = candidates.find(
    ({ name }) => normalizeItemName(name) === normalizedQuery
  );
  if (exact) {
    return exact;
  }

  const partial = candidates.find(({ name }) =>
    normalizeItemName(name).includes(normalizedQuery)
  );
  if (partial) {
    return partial;
  }

  return candidates[0] ?? null;
};

const scheduleQueueProcessing = (): void => {
  if (queueScheduled) {
    return;
  }

  queueScheduled = true;

  const run = () => {
    queueScheduled = false;
    processQueue();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as typeof window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
      run
    );
  } else {
    setTimeout(run, 0);
  }
};

const processQueue = (): void => {
  if (activeRequests >= MAX_CONCURRENT_XML_REQUESTS) {
    return;
  }

  const nextId = pendingIds.values().next();
  if (nextId.done) {
    return;
  }

  pendingIds.delete(nextId.value);
  activeRequests += 1;

  resolveId(nextId.value)
    .catch((error) => {
      console.warn('Failed to resolve item name via Wowhead XML', nextId.value, error);
    })
    .finally(() => {
      activeRequests -= 1;
      if (pendingIds.size > 0) {
        scheduleQueueProcessing();
      }
    });
};

const resolveId = async (itemId: number): Promise<string | null> => {
  const cache = ensureCache();
  const existing = cache.idToName.get(itemId);
  if (existing) {
    return existing;
  }

  const name = await fetchItemXml(itemId);
  if (!name) {
    return null;
  }

  storeMapping(name, itemId, true);
  return name;
};

export const ItemNameResolver = {
  async resolve(name: string): Promise<number | null> {
    const normalized = normalizeItemName(name);
    if (!normalized) {
      return null;
    }

    const cache = ensureCache();
    const cached = cache.nameToId.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    const results = await fetchSearchResults(name);
    const bestMatch = pickBestSearchMatch(name, results);
    if (!bestMatch) {
      return null;
    }

    storeMapping(bestMatch.name, bestMatch.id, true);
    storeMapping(name, bestMatch.id, true);
    pendingIds.add(bestMatch.id);
    scheduleQueueProcessing();

    return bestMatch.id;
  },

  async resolveMany(names: Iterable<string>): Promise<Map<string, number>> {
    const resolved = new Map<string, number>();
    const uniqueNames = Array.from(new Set(Array.from(names))).filter(Boolean);

    await Promise.all(
      uniqueNames.map(async (name) => {
        const itemId = await this.resolve(name);
        if (itemId !== null) {
          resolved.set(name, itemId);
        }
      })
    );

    return resolved;
  },

  async resolveId(itemId: number): Promise<string | null> {
    return resolveId(itemId);
  },

  queueIdResolution(ids: Iterable<number>): void {
    const iterableIds = Array.from(ids);
    let queued = false;
    iterableIds.forEach((id) => {
      if (!Number.isFinite(id)) {
        return;
      }

      if (!ensureCache().idToName.has(id)) {
        pendingIds.add(id);
        queued = true;
      }
    });

    if (queued) {
      scheduleQueueProcessing();
    }
  },

  prime(mapping: Map<string, number>): void {
    if (mapping.size === 0) {
      return;
    }

    let changed = false;
    mapping.forEach((id, name) => {
      const updated = storeMapping(name, id, false);
      if (updated) {
        changed = true;
      }
    });

    if (changed) {
      schedulePersist();
    }
  },

  addListener(listener: ItemNameResolutionListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clearCache(): void {
    cacheState = {
      nameToId: new Map(),
      idToName: new Map()
    };
    pendingIds = new Set();
    activeRequests = 0;
    LocalStorageAPI.clearItemNameCache();
  }
};
