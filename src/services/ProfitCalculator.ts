import { Recipe, CraftingProfit, ServerInfo, AuctionData } from '../types';
import { AuctionatorAPI, MockData } from './api';

export class ProfitCalculator {
  static async calculateProfitsForRecipes(
    recipes: Recipe[],
    server?: ServerInfo
  ): Promise<CraftingProfit[]> {
    const profits: CraftingProfit[] = [];

    for (const recipe of recipes) {
      const profit = await this.calculateProfitForRecipe(recipe, server);
      profits.push(profit);
    }

    return profits;
  }

  static async calculateProfitForRecipe(
    recipe: Recipe,
    server?: ServerInfo
  ): Promise<CraftingProfit> {
    const materialPrices = await this.getMaterialPrices(recipe, server);
    const totalCost = this.calculateTotalMaterialCost(recipe, materialPrices);
    const sellPrice = await this.getSellPrice(recipe.resultItem, server);

    const profit = sellPrice - totalCost;
    const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const roi = profitPercentage;

    return {
      recipe,
      totalCost,
      sellPrice,
      profit,
      profitPercentage,
      roi
    };
  }

  private static async getMaterialPrices(
    recipe: Recipe,
    server?: ServerInfo
  ): Promise<Map<number, AuctionData>> {
    const itemIds = recipe.materials.map((material) => material.item.id);

    if (!server) {
      return this.buildMockPrices(itemIds);
    }

    try {
      const prices = await AuctionatorAPI.getBulkPrices(itemIds, server.name, server.faction);
      if (prices.size > 0) {
        return prices;
      }
    } catch (error) {
      console.error('Failed to resolve material prices, using mock data fallback', error);
    }

    return this.buildMockPrices(itemIds);
  }

  private static buildMockPrices(itemIds: number[]): Map<number, AuctionData> {
    const mockPrices = new Map<number, AuctionData>();
    itemIds.forEach((itemId) => {
      mockPrices.set(itemId, MockData.getSampleAuctionData(itemId));
    });
    return mockPrices;
  }

  private static calculateTotalMaterialCost(
    recipe: Recipe,
    materialPrices: Map<number, AuctionData>
  ): number {
    let totalCost = 0;

    for (const material of recipe.materials) {
      const auctionData = materialPrices.get(material.item.id);
      if (auctionData) {
        const pricePerItem = auctionData.minBuyout || auctionData.medianPrice || 0;
        totalCost += pricePerItem * material.quantity;
      } else {
        const npcPrice = material.item.sellPrice || 0;
        totalCost += npcPrice * material.quantity;
      }
    }

    return totalCost;
  }

  private static async getSellPrice(item: ItemLike, server?: ServerInfo): Promise<number> {
    if (!server) {
      return this.getMockSellPrice(item.id);
    }

    try {
      const auctionData = await AuctionatorAPI.getItemPrice(item.id, server.name, server.faction);
      if (auctionData) {
        return auctionData.medianPrice || auctionData.minBuyout || 0;
      }
    } catch (error) {
      console.error('Failed to resolve sell price, using mock data fallback', error);
    }

    return this.getMockSellPrice(item.id);
  }

  private static getMockSellPrice(itemId: number): number {
    const mockData = MockData.getSampleAuctionData(itemId);
    return mockData.medianPrice || mockData.minBuyout || 0;
  }

  static calculateAverageProfit(profits: CraftingProfit[]): {
    averageProfit: number;
    averageROI: number;
    profitableCount: number;
    totalCount: number;
  } {
    if (profits.length === 0) {
      return {
        averageProfit: 0,
        averageROI: 0,
        profitableCount: 0,
        totalCount: 0
      };
    }

    const profitableProfits = profits.filter((p) => p.profit > 0);
    const averageProfit = profits.reduce((sum, p) => sum + p.profit, 0) / profits.length;
    const averageROI = profits.reduce((sum, p) => sum + p.roi, 0) / profits.length;

    return {
      averageProfit,
      averageROI,
      profitableCount: profitableProfits.length,
      totalCount: profits.length
    };
  }

  static filterByProfitability(
    profits: CraftingProfit[],
    criteria: {
      minProfit?: number;
      minROI?: number;
      maxCost?: number;
    }
  ): CraftingProfit[] {
    return profits.filter((profit) => {
      if (criteria.minProfit !== undefined && profit.profit < criteria.minProfit) {
        return false;
      }
      if (criteria.minROI !== undefined && profit.roi < criteria.minROI) {
        return false;
      }
      if (criteria.maxCost !== undefined && profit.totalCost > criteria.maxCost) {
        return false;
      }
      return true;
    });
  }

  static rankByProfitability(profits: CraftingProfit[]): CraftingProfit[] {
    return [...profits].sort((a, b) => {
      if (Math.abs(a.roi - b.roi) > 0.1) {
        return b.roi - a.roi;
      }
      return b.profit - a.profit;
    });
  }
}

interface ItemLike {
  id: number;
}