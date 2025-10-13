import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CraftingProfit, Profession } from '../types';
import { ProfitCalculator } from '../services/ProfitCalculator';
import { useProfessionRecipes } from '../hooks/useProfessionRecipes';
import { CraftingItem } from './CraftingItem';
import { StatsPanel } from './StatsPanel';
import { LoadingSpinner } from './LoadingSpinner';

type SortOption = 'profit' | 'profitPercent' | 'name' | 'cost';
type FilterOption = 'all' | 'profitable' | 'unprofitable';

interface CraftingListProps {
  profession: Profession;
  isRefreshing: boolean;
}

export const CraftingList: React.FC<CraftingListProps> = ({ profession, isRefreshing }) => {
  const { recipes, isLoading: recipesLoading, error } = useProfessionRecipes(profession);
  const [craftingProfits, setCraftingProfits] = useState<CraftingProfit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('profit');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isLoading = isRefreshing || recipesLoading;

  useEffect(() => {
    let isCancelled = false;

    const calculateProfits = async () => {
      if (recipes.length === 0) {
        setCraftingProfits([]);
        return;
      }

      const profits = await ProfitCalculator.calculateProfitsForRecipes(recipes);
      if (!isCancelled) {
        setCraftingProfits(profits);
      }
    };

    calculateProfits();

    return () => {
      isCancelled = true;
    };
  }, [recipes]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(recipes.map((recipe) => recipe.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [recipes]);

  const filteredAndSortedProfits = useMemo(() => {
    const filtered = craftingProfits.filter((profit) => {
      const matchesSearch = profit.recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || profit.recipe.category === selectedCategory;

      let matchesFilter = true;
      if (filterBy === 'profitable') {
        matchesFilter = profit.profit > 0;
      } else if (filterBy === 'unprofitable') {
        matchesFilter = profit.profit <= 0;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          return b.profit - a.profit;
        case 'profitPercent':
          return b.profitPercentage - a.profitPercentage;
        case 'name':
          return a.recipe.name.localeCompare(b.recipe.name);
        case 'cost':
          return a.totalCost - b.totalCost;
        default:
          return 0;
      }
    });
  }, [craftingProfits, searchTerm, selectedCategory, filterBy, sortBy]);

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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 text-center border border-gray-600/50">
        <p className="text-gray-300 text-lg">No crafting recipes were found for this profession.</p>
        <p className="text-gray-500 text-sm mt-2">
          Try choosing another profession or verify that the CSV data contains recipes for this
          skill line.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-600/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-3" aria-hidden>
                {profession.icon}
              </span>
              {profession.name}
            </h2>
            <p className="text-gray-400 mt-1">
              Crafted items and reagent breakdown sourced from the local CSV database.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-wow-gold">
              {craftingProfits.filter((p) => p.profit > 0).length}
            </div>
            <div className="text-sm text-gray-400">Profitable crafts detected</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a recipe..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent appearance-none cursor-pointer"
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
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent appearance-none cursor-pointer"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterBy === 'all'
                  ? 'bg-wow-blue text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBy('profitable')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterBy === 'profitable'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              Profitable
            </button>
            <button
              onClick={() => setFilterBy('unprofitable')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterBy === 'unprofitable'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              Unprofitable
            </button>
          </div>
        </div>
      </div>

      {craftingProfits.length > 0 && (
        <StatsPanel craftingProfits={craftingProfits} professionName={profession.name} />
      )}

      <div className="space-y-3">
        {filteredAndSortedProfits.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 text-center border border-gray-600/50">
            <p className="text-gray-400 text-lg">No recipes match the selected filters.</p>
            <p className="text-gray-500 text-sm mt-2">
              Adjust your search term, filter options, or pick a different category.
            </p>
          </div>
        ) : (
          filteredAndSortedProfits.map((craftingProfit) => (
            <CraftingItem key={craftingProfit.recipe.id} craftingProfit={craftingProfit} />
          ))
        )}
      </div>
    </div>
  );
};
