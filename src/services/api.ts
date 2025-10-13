import axios from 'axios';
import { AuctionData, Item, Recipe, ServerInfo } from '../types';

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

export class LocalStorageAPI {
  static saveServerInfo(serverInfo: ServerInfo): void {
    localStorage.setItem('wow-server-info', JSON.stringify(serverInfo));
  }

  static getServerInfo(): ServerInfo | null {
    const data = localStorage.getItem('wow-server-info');
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        lastUpdated: parsed?.lastUpdated ? new Date(parsed.lastUpdated) : new Date()
      };
    } catch (error) {
      console.error('Failed to parse stored server info', error);
      return null;
    }
  }

  static saveUserPreferences(preferences: unknown): void {
    localStorage.setItem('wow-user-preferences', JSON.stringify(preferences));
  }

  static getUserPreferences(): unknown {
    const data = localStorage.getItem('wow-user-preferences');
    return data ? JSON.parse(data) : {};
  }

  static clearAll(): void {
    localStorage.removeItem('wow-server-info');
    localStorage.removeItem('wow-user-preferences');
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
    isLearned: true
  })
};
