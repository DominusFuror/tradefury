import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CraftingProfit, Profession, Item } from '../types';
import { ProfitCalculator } from '../services/ProfitCalculator';
import { useProfessionRecipes } from '../hooks/useProfessionRecipes';
import { CraftingItem } from './CraftingItem';
import { StatsPanel } from './StatsPanel';
import { LoadingSpinner } from './LoadingSpinner';
import { ItemDetailsModal } from './ItemDetailsModal';
import { PriceHistoryEntry } from '../services/AuctionatorDataService';
import { ItemNameResolver } from '../services/ItemNameResolver';

type SortOption = 'profit' | 'profitPercent' | 'name' | 'cost';
type FilterOption = 'all' | 'profitable' | 'unprofitable';

interface CraftingListProps {
  profession: Profession;
  isRefreshing: boolean;
  priceMap: Map<number, number> | null;
  priceHistory: Map<number, PriceHistoryEntry[]> | null;
  hasPriceData: boolean;
}

interface SelectedItemDetails {
  item: Item;
  history: PriceHistoryEntry[];
  asResult: CraftingProfit | null;
  usedIn: CraftingProfit[];
}

export const CraftingList: React.FC<CraftingListProps> = ({
  profession,
  isRefreshing,
  priceMap,
  priceHistory,
  hasPriceData
}) => {
  const { recipes, isLoading: recipesLoading, error } = useProfessionRecipes(profession);
  const [craftingProfits, setCraftingProfits] = useState<CraftingProfit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('profit');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [minSkillInput, setMinSkillInput] = useState<string>('');
  const [maxSkillInput, setMaxSkillInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [densityLevel, setDensityLevel] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<SelectedItemDetails | null>(null);

  const isLoading = isRefreshing || recipesLoading;
  const resultMap = useMemo(() => {
    const map = new Map<number, CraftingProfit>();
    craftingProfits.forEach((profit) => {
      map.set(profit.recipe.resultItem.id, profit);
    });
    return map;
  }, [craftingProfits]);

  const usageMap = useMemo(() => {
    const map = new Map<number, CraftingProfit[]>();
    craftingProfits.forEach((profit) => {
      profit.recipe.materials.forEach((material) => {
        if (map.has(material.item.id)) {
          map.get(material.item.id)?.push(profit);
        } else {
          map.set(material.item.id, [profit]);
        }
      });
    });
    return map;
  }, [craftingProfits]);

  const handleShowItemDetails = useCallback(
    (item: Item) => {
      const history = priceHistory?.get(item.id) ?? [];
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
      );
      const asResult = resultMap.get(item.id) ?? null;
      const usedIn = usageMap.get(item.id) ?? [];

      setSelectedItem({
        item,
        history: sortedHistory,
        asResult,
        usedIn
      });
    },
    [priceHistory, resultMap, usageMap]
  );

  const handleCloseItemDetails = useCallback(() => setSelectedItem(null), []);

  const handleApplyLichKingRange = useCallback(() => {
    setMinSkillInput('376');
    setMaxSkillInput(String(profession.maxLevel));
  }, [profession.maxLevel]);

  const handleResetSkillRange = useCallback(() => {
    setMinSkillInput('');
    setMaxSkillInput('');
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const calculateProfits = async () => {
      if (recipes.length === 0) {
        setCraftingProfits([]);
        return;
      }

      const profits = await ProfitCalculator.calculateProfitsForRecipes(recipes, {
        priceMap
      });
      if (!isCancelled) {
        setCraftingProfits(profits);
      }
    };

    calculateProfits();

    return () => {
      isCancelled = true;
    };
  }, [recipes, priceMap]);

  useEffect(() => {
    const unsubscribe = ItemNameResolver.addListener(({ id, name }) => {
      setCraftingProfits((prev) =>
        prev.map((profit) => {
          let recipeChanged = false;
          let resultItem = profit.recipe.resultItem;

          if (resultItem.id === id && resultItem.name !== name) {
            resultItem = { ...resultItem, name };
            recipeChanged = true;
          }

          let materialsChanged = false;
          const updatedMaterials = profit.recipe.materials.map((material) => {
            if (material.item.id === id && material.item.name !== name) {
              materialsChanged = true;
              return {
                ...material,
                item: {
                  ...material.item,
                  name
                }
              };
            }
            return material;
          });

          if (!recipeChanged && !materialsChanged) {
            return profit;
          }

          const newRecipe = {
            ...profit.recipe,
            resultItem,
            materials: materialsChanged ? updatedMaterials : profit.recipe.materials
          };

          return {
            ...profit,
            recipe: newRecipe
          };
        })
      );
    });

    return unsubscribe;
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(recipes.map((recipe) => recipe.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [recipes]);

  const filteredAndSortedProfits = useMemo(() => {
    const parsedMinSkill = parseInt(minSkillInput, 10);
    const minSkillValue = Number.isNaN(parsedMinSkill) ? null : parsedMinSkill;
    const parsedMaxSkill = parseInt(maxSkillInput, 10);
    const maxSkillValue = Number.isNaN(parsedMaxSkill) ? null : parsedMaxSkill;

    const filtered = craftingProfits.filter((profit) => {
      const matchesSearch = profit.recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || profit.recipe.category === selectedCategory;

      let matchesFilter = true;
      if (filterBy === 'profitable') {
        matchesFilter = profit.isCalculable && profit.profit > 0;
      } else if (filterBy === 'unprofitable') {
        matchesFilter = profit.isCalculable && profit.profit <= 0;
      }

      let matchesSkillRange = true;
      if (minSkillValue !== null && profit.recipe.skillLevel < minSkillValue) {
        matchesSkillRange = false;
      }
      if (maxSkillValue !== null && profit.recipe.skillLevel > maxSkillValue) {
        matchesSkillRange = false;
      }

      return matchesSearch && matchesCategory && matchesFilter && matchesSkillRange;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          if (a.isCalculable !== b.isCalculable) {
            return a.isCalculable ? -1 : 1;
          }
          return b.profit - a.profit;
        case 'profitPercent':
          if (a.isCalculable !== b.isCalculable) {
            return a.isCalculable ? -1 : 1;
          }
          return b.profitPercentage - a.profitPercentage;
        case 'name':
          return a.recipe.name.localeCompare(b.recipe.name);
        case 'cost':
          return a.totalCost - b.totalCost;
        default:
          return 0;
      }
    });
  }, [
    craftingProfits,
    searchTerm,
    selectedCategory,
    filterBy,
    sortBy,
    minSkillInput,
    maxSkillInput
  ]);

  if (isLoading) {
    return <LoadingSpinner message="Loading profession recipes..." size="lg" />;
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg p-8 text-center border border-[#24252b]">
        <p className="text-gray-300 text-lg">No crafting recipes were found for this profession.</p>
        <p className="text-gray-500 text-sm mt-2">
          Try choosing another profession or verify that the CSV data contains recipes for this
          skill line.
        </p>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="space-y-6">
          <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg p-6 border border-[#24252b]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <img
                    src={profession.icon}
                    alt={`${profession.name} icon`}
                    className="w-10 h-10 mr-3 rounded-sm object-contain bg-[#1a1b21]/60 p-1"
                    loading="lazy"
                  />
                  {profession.name}
                </h2>
                <p className="text-gray-400 mt-1">
                  Crafted items and reagent breakdown sourced from the local CSV database.
                </p>
                {!hasPriceData && (
                  <p className="text-yellow-300 text-sm mt-2">
                    Import Auctionator.lua to use live auction prices for cost calculations.
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-wow-gold">
                  {craftingProfits.filter((p) => p.isCalculable && p.profit > 0).length}
                </div>
                <div className="text-sm text-gray-400">Profitable crafts detected</div>
              </div>
            </div>
          </div>

          <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg p-4 border border-[#24252b]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a recipe..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#18191f]/80 border border-[#2e3036] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="w-full px-4 py-2 bg-[#18191f]/80 border border-[#2e3036] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="profit">Sort by profit</option>
                  <option value="profitPercent">Sort by profit %</option>
                  <option value="name">Sort by name</option>
                  <option value="cost">Sort by material cost</option>
                </select>
              </div>

              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full px-4 py-2 bg-[#18191f]/80 border border-[#2e3036] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent appearance-none cursor-pointer"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All categories' : category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterBy('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterBy === 'all'
                      ? 'bg-wow-blue text-white'
                      : 'bg-[#1a1b21]/80 text-gray-300 hover:bg-[#22232a]/80'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterBy('profitable')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterBy === 'profitable'
                      ? 'bg-green-600 text-white'
                      : 'bg-[#1a1b21]/80 text-gray-300 hover:bg-[#22232a]/80'
                  }`}
                >
                  Profitable
                </button>
                <button
                  onClick={() => setFilterBy('unprofitable')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterBy === 'unprofitable'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#1a1b21]/80 text-gray-300 hover:bg-[#22232a]/80'
                  }`}
                >
                  Unprofitable
                </button>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm text-gray-300">Skill range</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={profession.maxLevel}
                placeholder="Min"
                value={minSkillInput}
                onChange={(event) => setMinSkillInput(event.target.value)}
                className="w-full min-w-[110px] flex-1 px-3 py-2 bg-[#18191f]/80 border border-[#2e3036] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="number"
                min={0}
                max={profession.maxLevel}
                placeholder="Max"
                value={maxSkillInput}
                onChange={(event) => setMaxSkillInput(event.target.value)}
                className="w-full min-w-[110px] flex-1 px-3 py-2 bg-[#18191f]/80 border border-[#2e3036] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
              />
            </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleApplyLichKingRange}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-[#1a1b21]/80 text-gray-300 hover:bg-[#22232a]/80 transition-colors"
                  >
                    Lich King Items
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSkillRange}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-[#1a1b21]/80 text-gray-300 hover:bg-[#22232a]/80 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-300">Row density</label>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={densityLevel}
                  onChange={(event) => setDensityLevel(Number(event.target.value))}
                  className="mt-2 w-full accent-blue-400"
                />
                <span className="text-xs text-gray-400 mt-1">
                  {['Ultra compact', 'Compact', 'Comfortable', 'Roomy'][densityLevel]}
                </span>
              </div>
            </div>
          </div>

          {craftingProfits.length > 0 && (
            <StatsPanel craftingProfits={craftingProfits} professionName={profession.name} />
          )}

        <div className="space-y-3">
          {filteredAndSortedProfits.length === 0 ? (
            <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg p-8 text-center border border-[#24252b]">
              <p className="text-gray-400 text-lg">No recipes match the selected filters.</p>
              <p className="text-gray-500 text-sm mt-2">
                Adjust your search term, filter options, or pick a different category.
              </p>
            </div>
          ) : (
            filteredAndSortedProfits.map((craftingProfit) => (
              <CraftingItem
                key={craftingProfit.recipe.id}
                craftingProfit={craftingProfit}
                densityLevel={densityLevel}
                priceHistory={priceHistory}
                onShowItemDetails={handleShowItemDetails}
              />
            ))
          )}
        </div>
      </div>
      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem.item}
          history={selectedItem.history}
          asResult={selectedItem.asResult}
          usedIn={selectedItem.usedIn}
          onClose={handleCloseItemDetails}
        />
      )}
    </React.Fragment>
  );
};
