import axios from 'axios';
import { AuctionData, Item, Recipe, ServerInfo } from '../types';
import { SharedStorageClient } from './SharedStorageClient';

// Base URL for a future backend proxy. For now the project relies on mock data.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

export class AuctionatorAPI {
  static async getItemPrice(
    itemId: number,
    server: string,
    faction: ServerInfo['faction']
  ): Promise<AuctionData | null> {
    try {
      const response = await api.get(`/auctionator/item/${itemId}`, {
        params: { server, faction }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch single item price from Auctionator API', error);
      return null;
    }
  }

  static async getBulkPrices(
    itemIds: number[],
    server: string,
    faction: ServerInfo['faction']
  ): Promise<Map<number, AuctionData>> {
    try {
      const response = await api.post('/auctionator/bulk', {
        itemIds,
        server,
        faction
      });

      const prices = new Map<number, AuctionData>();
      response.data.forEach((data: AuctionData) => {
        prices.set(data.itemId, data);
      });

      return prices;
    } catch (error) {
      console.error('Failed to fetch bulk prices from Auctionator API', error);
      return new Map();
    }
  }
}

export class WowheadAPI {
  static async getItemInfo(itemId: number): Promise<Item | null> {
    try {
      const response = await api.get(`/wowhead/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch item information from Wowhead API', error);
      return null;
    }
  }

  static async getRecipeInfo(recipeId: number): Promise<Recipe | null> {
    try {
      const response = await api.get(`/wowhead/recipe/${recipeId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recipe information from Wowhead API', error);
      return null;
    }
  }

  static async getRecipesByProfession(professionId: number): Promise<Recipe[]> {
    try {
      const response = await api.get(`/wowhead/recipes/profession/${professionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recipes for profession', error);
      return [];
    }
  }

  static async searchItems(query: string): Promise<Item[]> {
    try {
      const response = await api.get('/wowhead/search/items', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search items on Wowhead API', error);
      return [];
    }
  }
}

const STORAGE_KEYS = {
  AUCTIONATOR_DATA: 'auctionator-data',
  ITEM_NAME_CACHE: 'item-name-cache',
  SERVER_INFO: 'server-info',
  USER_PREFERENCES: 'user-preferences'
} as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class PersistentStorage {
  static async saveServerInfo(serverInfo: ServerInfo): Promise<void> {
    await SharedStorageClient.writeJson(STORAGE_KEYS.SERVER_INFO, serverInfo);
  }

  static async getServerInfo(): Promise<ServerInfo | null> {
    const data = await SharedStorageClient.readJson<Record<string, unknown>>(
      STORAGE_KEYS.SERVER_INFO
    );
    if (!isPlainObject(data)) {
      return null;
    }

    const name = typeof data.name === 'string' ? data.name : null;
    const region = typeof data.region === 'string' ? data.region : null;
    const faction =
      data.faction === 'Alliance' || data.faction === 'Horde' ? data.faction : null;
    if (!name || !region || !faction) {
      return null;
    }

    const lastUpdatedRaw = data.lastUpdated;
    const lastUpdated =
      typeof lastUpdatedRaw === 'string' || lastUpdatedRaw instanceof Date
        ? new Date(lastUpdatedRaw)
        : new Date();

    return {
      name,
      region,
      faction,
      lastUpdated
    };
  }

  static async saveUserPreferences(preferences: unknown): Promise<void> {
    await SharedStorageClient.writeJson(STORAGE_KEYS.USER_PREFERENCES, preferences ?? {});
  }

  static async getUserPreferences(): Promise<Record<string, unknown>> {
    const data = await SharedStorageClient.readJson(STORAGE_KEYS.USER_PREFERENCES);
    if (isPlainObject(data)) {
      return data;
    }
    return {};
  }

  static async saveAuctionatorData(payload: unknown): Promise<void> {
    await SharedStorageClient.writeJson(STORAGE_KEYS.AUCTIONATOR_DATA, payload ?? null);
  }

  static async getAuctionatorData(): Promise<unknown> {
    return SharedStorageClient.readJson(STORAGE_KEYS.AUCTIONATOR_DATA);
  }

  static async saveItemNameCache(payload: {
    nameToId: Record<string, number>;
    idToName: Record<number, string>;
  }): Promise<void> {
    await SharedStorageClient.writeJson(STORAGE_KEYS.ITEM_NAME_CACHE, payload);
  }

  static async getItemNameCache(): Promise<{
    nameToId: Record<string, number>;
    idToName: Record<number, string>;
  }> {
    const data = await SharedStorageClient.readJson(STORAGE_KEYS.ITEM_NAME_CACHE);
    if (!isPlainObject(data)) {
      return { nameToId: {}, idToName: {} };
    }

    const nameToIdRaw = isPlainObject(data.nameToId) ? data.nameToId : data;
    const idToNameRaw = isPlainObject(data.idToName) ? data.idToName : {};

    const nameToId: Record<string, number> = {};
    Object.entries(nameToIdRaw).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        nameToId[key] = value;
      }
    });

    const idToName: Record<number, string> = {};
    Object.entries(idToNameRaw).forEach(([key, value]) => {
      const numericKey = Number(key);
      if (!Number.isNaN(numericKey) && typeof value === 'string' && value.length > 0) {
        idToName[numericKey] = value;
      }
    });

    return { nameToId, idToName };
  }

  static async clearItemNameCache(): Promise<void> {
    await SharedStorageClient.deleteKey(STORAGE_KEYS.ITEM_NAME_CACHE);
  }

  static async clearAuctionatorData(): Promise<void> {
    await SharedStorageClient.deleteKey(STORAGE_KEYS.AUCTIONATOR_DATA);
  }

  static async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) => SharedStorageClient.deleteKey(key))
    );
  }
}

// Temporary mocks until real backend/API integration is implemented.
export const MockData = {
  getSampleAuctionData: (itemId: number): AuctionData => ({
    itemId,
    server: 'Icecrown',
    faction: 'Alliance',
    minBuyout: Math.floor(Math.random() * 1000) + 100,
    medianPrice: Math.floor(Math.random() * 1200) + 150,
    lastUpdated: new Date(),
    quantity: Math.floor(Math.random() * 50) + 1
  }),

  getSampleItem: (id: number): Item => ({
    id,
    name: `Примерный предмет ${id}`,
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg',
    quality: 'Uncommon',
    itemLevel: Math.floor(Math.random() * 100) + 50,
    sellPrice: Math.floor(Math.random() * 500) + 50,
    stackSize: 20
  }),

  getSampleRecipe: (id: number, professionId: number): Recipe => ({
    id,
    name: `Рецепт №${id}`,
    profession: {
      id: professionId,
      name: 'Профессия',
      icon: 'TMP',
      maxLevel: 450,
      categories: ['Основные изделия']
    },
    skillLevel: Math.floor(Math.random() * 100) + 200,
    resultItem: MockData.getSampleItem(id),
    materials: [
      {
        item: MockData.getSampleItem(id + 1000),
        quantity: Math.floor(Math.random() * 5) + 1
      },
      {
        item: MockData.getSampleItem(id + 2000),
        quantity: Math.floor(Math.random() * 3) + 1
      }
    ],
    category: 'Базовые товары',
    outputCount: 1,
    isLearned: true
  })
};

