import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Star } from 'lucide-react';
import { CraftingProfit } from '../types';
import { WowheadLink } from './WowheadLink';

interface StatsPanelProps {
  craftingProfits: CraftingProfit[];
  professionName: string;
}

const formatCurrency = (amount: number): string => {
  const absolute = Math.abs(Math.round(amount));
  const gold = Math.floor(absolute / 10000);
  const silver = Math.floor((absolute % 10000) / 100);
  const copper = absolute % 100;

  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (gold > 0 || silver > 0) parts.push(`${silver}s`);
  parts.push(`${copper}c`);

  return parts.join(' ');
};

const getStatColor = (value: number) => {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-yellow-400';
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ craftingProfits, professionName }) => {
  const profitableCrafts = craftingProfits.filter((p) => p.profit > 0);
  const unprofitableCrafts = craftingProfits.filter((p) => p.profit <= 0);

  const totalProfit = craftingProfits.reduce((sum, p) => sum + p.profit, 0);
  const averageProfit = craftingProfits.length > 0 ? totalProfit / craftingProfits.length : 0;
  const averageROI =
    craftingProfits.length > 0
      ? craftingProfits.reduce((sum, p) => sum + p.roi, 0) / craftingProfits.length
      : 0;

  const bestCraft =
    craftingProfits.length > 0
      ? craftingProfits.reduce((best, current) => (current.profit > best.profit ? current : best))
      : null;

  const worstCraft =
    craftingProfits.length > 0
      ? craftingProfits.reduce((worst, current) => (current.profit < worst.profit ? current : worst))
      : null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-600/50">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <Star className="h-6 w-6 mr-3 text-wow-purple" />
        Key metrics for {professionName}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Tracked recipes</p>
              <p className="text-2xl font-bold text-white">{craftingProfits.length}</p>
            </div>
            <Target className="h-8 w-8 text-wow-blue" />
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Profitable</p>
              <p className="text-2xl font-bold text-green-400">{profitableCrafts.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Unprofitable</p>
              <p className="text-2xl font-bold text-red-400">{unprofitableCrafts.length}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average ROI</p>
              <p className={`text-2xl font-bold ${getStatColor(averageROI)}`}>
                {averageROI > 0 ? '+' : ''}
                {averageROI.toFixed(1)}%
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-wow-gold" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Best performer
          </h4>
          {bestCraft && bestCraft.profit > 0 ? (
            <div>
              <div className="flex items-center space-x-2">
                <WowheadLink
                  id={bestCraft.recipe.id}
                  type="spell"
                  name={bestCraft.recipe.name}
                  icon={bestCraft.recipe.resultItem.icon}
                  anchorClassName="inline-flex"
                >
                  <img
                    src={bestCraft.recipe.resultItem.icon}
                    alt={bestCraft.recipe.name}
                    className="w-6 h-6 rounded border border-gray-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                    }}
                  />
                </WowheadLink>
                <span className="text-white font-medium">{bestCraft.recipe.name}</span>
              </div>
              <p className="text-green-400 font-bold">
                +{formatCurrency(bestCraft.profit)} ({bestCraft.roi.toFixed(1)}% ROI)
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No profitable crafts identified.</p>
          )}
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
          <h4 className="text-lg font-semibold text-red-400 mb-3 flex items-center">
            <TrendingDown className="h-5 w-5 mr-2" />
            Worst performer
          </h4>
          {worstCraft && worstCraft.profit < 0 ? (
            <div>
              <div className="flex items-center space-x-2">
                <WowheadLink
                  id={worstCraft.recipe.id}
                  type="spell"
                  name={worstCraft.recipe.name}
                  icon={worstCraft.recipe.resultItem.icon}
                  anchorClassName="inline-flex"
                >
                  <img
                    src={worstCraft.recipe.resultItem.icon}
                    alt={worstCraft.recipe.name}
                    className="w-6 h-6 rounded border border-gray-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                    }}
                  />
                </WowheadLink>
                <span className="text-white font-medium">{worstCraft.recipe.name}</span>
              </div>
              <p className="text-red-400 font-bold">
                {formatCurrency(worstCraft.profit)} ({worstCraft.roi.toFixed(1)}% ROI)
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No loss-making crafts identified.</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
        <h4 className="text-lg font-semibold text-wow-gold mb-3 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Profit summary
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Average profit</p>
            <p className={`text-xl font-bold ${getStatColor(averageProfit)}`}>
              {averageProfit > 0 ? '+' : ''}
              {formatCurrency(averageProfit)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total profit</p>
            <p className={`text-xl font-bold ${getStatColor(totalProfit)}`}>
              {totalProfit > 0 ? '+' : ''}
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Share of profitable crafts</p>
            <p className="text-xl font-bold text-white">
              {craftingProfits.length > 0
                ? ((profitableCrafts.length / craftingProfits.length) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
