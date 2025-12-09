import { Recipe, CraftingProfit, MaterialCostInfo, PriceSource } from '../types';
import { gameDataRepository } from './GameDataRepository';

interface ProfitCalculationOptions {
  priceMap?: Map<number, number> | null;
}

interface ResolvedPrice {
  value: number | null;
  source: PriceSource;
}

export class ProfitCalculator {
  static async calculateProfitsForRecipes(
    recipes: Recipe[],
    options?: ProfitCalculationOptions
  ): Promise<CraftingProfit[]> {
    return recipes.map((recipe) => this.calculateProfitForRecipe(recipe, options));
  }

  private static calculateProfitForRecipe(
    recipe: Recipe,
    options?: ProfitCalculationOptions
  ): CraftingProfit {
    const materialCosts: MaterialCostInfo[] = recipe.materials.map((material, index) => {
      const resolved = this.resolvePrice(material.item.id, options?.priceMap);

      return {
        index,
        itemId: material.item.id,
        quantity: material.quantity,
        unitPrice: resolved.value,
        vendorPrice: resolved.vendorPrice,
        auctionPrice: resolved.auctionPrice,
        source: resolved.source
      };
    });

    const totalCost = materialCosts.reduce((sum, info) => {
      const unitPrice = info.unitPrice ?? 0;
      return sum + unitPrice * info.quantity;
    }, 0);

    const hasMissingMaterialPrices = materialCosts.some((info) => info.unitPrice === null);

    const resolvedSellPrice = this.resolvePrice(recipe.resultItem.id, options?.priceMap);
    const resultUnitPrice = resolvedSellPrice.value;
    const sellPriceSource = resolvedSellPrice.source;
    const sellPrice = (resultUnitPrice ?? 0) * (recipe.outputCount || 1);

    const isCalculable = !hasMissingMaterialPrices && resultUnitPrice !== null;
    const profit = isCalculable ? sellPrice - totalCost : 0;
    const profitPercentage = isCalculable && totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const roi = profitPercentage;
    const hasMissingPrices = hasMissingMaterialPrices || resultUnitPrice === null;

    return {
      recipe,
      totalCost,
      sellPrice,
      resultUnitPrice,
      sellPriceSource,
      profit,
      profitPercentage,
      roi,
      materialCosts,
      hasMissingPrices,
      isCalculable
    };
  }

  private static resolvePrice(
    itemId: number,
    priceMap?: Map<number, number> | null
  ): ResolvedPrice & { vendorPrice?: number | null; auctionPrice?: number | null } {
    const vendorPrice = gameDataRepository.getVendorPrice(itemId);
    const auctionPrice = priceMap?.get(itemId) ?? null;

    if (vendorPrice !== undefined && vendorPrice !== null) {
      return {
        value: vendorPrice,
        source: 'vendor',
        vendorPrice,
        auctionPrice
      };
    }

    if (auctionPrice !== null) {
      return {
        value: auctionPrice,
        source: 'auctionator',
        vendorPrice: null,
        auctionPrice
      };
    }

    return {
      value: null,
      source: 'unavailable',
      vendorPrice: null,
      auctionPrice: null
    };
  }

  static calculateAverageProfit(profits: CraftingProfit[]): {
    averageProfit: number;
    averageROI: number;
    profitableCount: number;
    totalCount: number;
  } {
    const calculable = profits.filter((p) => p.isCalculable);

    if (calculable.length === 0) {
      return {
        averageProfit: 0,
        averageROI: 0,
        profitableCount: 0,
        totalCount: 0
      };
    }

    const profitableProfits = calculable.filter((p) => p.profit > 0);
    const averageProfit = calculable.reduce((sum, p) => sum + p.profit, 0) / calculable.length;
    const averageROI = calculable.reduce((sum, p) => sum + p.roi, 0) / calculable.length;

    return {
      averageProfit,
      averageROI,
      profitableCount: profitableProfits.length,
      totalCount: calculable.length
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
      if (!profit.isCalculable) {
        return false;
      }
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
      if (a.isCalculable !== b.isCalculable) {
        return a.isCalculable ? -1 : 1;
      }
      if (!a.isCalculable && !b.isCalculable) {
        return 0;
      }
      if (Math.abs(a.roi - b.roi) > 0.1) {
        return b.roi - a.roi;
      }
      return b.profit - a.profit;
    });
  }
}
