import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Package, Target } from 'lucide-react';
import { CraftingProfit } from '../types';
import { WowheadLink } from './WowheadLink';

interface CraftingItemProps {
  craftingProfit: CraftingProfit;
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

const getProfitColor = (value: number) => {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-yellow-400';
};

const getProfitIcon = (value: number) => {
  if (value > 0) return <TrendingUp className="h-4 w-4" />;
  if (value < 0) return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

const getQualityColor = (quality: string) => {
  switch (quality) {
    case 'Poor':
      return 'text-gray-400';
    case 'Common':
      return 'text-white';
    case 'Uncommon':
      return 'text-green-400';
    case 'Rare':
      return 'text-blue-400';
    case 'Epic':
      return 'text-purple-400';
    case 'Legendary':
      return 'text-orange-400';
    case 'Artifact':
      return 'text-red-400';
    default:
      return 'text-white';
  }
};

export const CraftingItem: React.FC<CraftingItemProps> = ({ craftingProfit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { recipe, totalCost, sellPrice, profit, profitPercentage, roi } = craftingProfit;

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-600/50 overflow-hidden">
      <div
        className="w-full text-left p-4 hover:bg-gray-700/30 transition-colors duration-200 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <WowheadLink
              id={recipe.id}
              type="spell"
              name={recipe.name}
              icon={recipe.resultItem.icon}
              anchorClassName="inline-flex"
              tooltipPlacement="bottom"
            >
              <img
                src={recipe.resultItem.icon}
                alt={recipe.resultItem.name}
                className="w-12 h-12 rounded border-2 border-gray-600"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                }}
              />
            </WowheadLink>

            <div className="flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{recipe.name}</h3>
                <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded">
                  {recipe.category}
                </span>
                <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
                  Skill level: {recipe.skillLevel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-400">
                <span className={getQualityColor(recipe.resultItem.quality)}>
                  {recipe.resultItem.quality}
                </span>
                <span>iLvl {recipe.resultItem.itemLevel}</span>
                <span>Output quantity: {recipe.resultItem.stackSize}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">Material cost</div>
              <div className="text-white font-medium">{formatCurrency(totalCost)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Expected sale price</div>
              <div className="text-white font-medium">{formatCurrency(sellPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Profit</div>
              <div className={`font-bold flex items-center space-x-1 ${getProfitColor(profit)}`}>
                {getProfitIcon(profit)}
                <span>{formatCurrency(profit)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Profit %</div>
              <div className={`font-bold ${getProfitColor(profitPercentage)}`}>
                {profitPercentage > 0 ? '+' : ''}
                {profitPercentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-600/50 p-4 bg-gray-900/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Package className="h-5 w-5 mr-2 text-wow-blue" />
                Required materials
              </h4>
              <div className="space-y-2">
                {recipe.materials.map((material, index) => (
                  <div
                    key={`${material.item.id}-${index}`}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <WowheadLink
                        id={material.item.id}
                        type="item"
                        name={material.item.name}
                        icon={material.item.icon}
                        anchorClassName="inline-flex"
                      >
                        <img
                          src={material.item.icon}
                          alt={material.item.name}
                          className="w-8 h-8 rounded border border-gray-600"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                          }}
                        />
                      </WowheadLink>
                      <div>
                        <div className="text-white font-medium">{material.item.name}</div>
                        <div className={`text-sm ${getQualityColor(material.item.quality)}`}>
                          {material.item.quality}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{material.quantity}x</div>
                      <div className="text-sm text-gray-400">
                        {formatCurrency((material.item.sellPrice || 0) * material.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2 text-wow-purple" />
                Profit breakdown
              </h4>
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Total material cost</div>
                      <div className="text-white font-medium">{formatCurrency(totalCost)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Expected sale price</div>
                      <div className="text-white font-medium">{formatCurrency(sellPrice)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Net profit</div>
                      <div className={`font-bold ${getProfitColor(profit)}`}>
                        {profit > 0 ? '+' : ''}
                        {formatCurrency(profit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">ROI</div>
                      <div className={`font-bold ${getProfitColor(roi)}`}>
                        {roi > 0 ? '+' : ''}
                        {roi.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Insight</div>
                  {profit > 0 ? (
                    <div className="text-green-400 text-sm">
                      Crafting is profitable. ROI: {roi.toFixed(1)}%
                    </div>
                  ) : profit < 0 ? (
                    <div className="text-red-400 text-sm">
                      Crafting loses gold. Consider sourcing cheaper reagents or selling the inputs.
                    </div>
                  ) : (
                    <div className="text-yellow-400 text-sm">
                      Crafting breaks even. Small market changes may swing this recipe either way.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
