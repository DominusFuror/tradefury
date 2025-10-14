import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Package, Target } from 'lucide-react';
import { CraftingProfit } from '../types';
import { WowheadLink } from './WowheadLink';
import { CurrencyAmount, type CurrencySize } from './CurrencyAmount';

interface CraftingItemProps {
  craftingProfit: CraftingProfit;
  densityLevel: number;
}

const resolveDensityClass = <T,>(values: T[], level: number): T => {
  const index = Math.min(Math.max(Math.round(level), 0), values.length - 1);
  return values[index];
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

export const CraftingItem: React.FC<CraftingItemProps> = ({ craftingProfit, densityLevel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    recipe,
    totalCost,
    sellPrice,
    profit,
    profitPercentage,
    roi,
    materialCosts,
    hasMissingPrices,
    sellPriceSource,
    resultUnitPrice,
    isCalculable
  } = craftingProfit;

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const headerPadding = resolveDensityClass(['p-2', 'p-3', 'p-4', 'p-5'], densityLevel);
  const headerGap = resolveDensityClass(['space-x-2', 'space-x-3', 'space-x-4', 'space-x-6'], densityLevel);
  const metricsGap = resolveDensityClass(['space-x-3', 'space-x-4', 'space-x-6', 'space-x-8'], densityLevel);
  const imageSize = resolveDensityClass(['w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-14 h-14'], densityLevel);
  const titleSize = resolveDensityClass(['text-sm', 'text-base', 'text-lg', 'text-xl'], densityLevel);
  const infoTextSize = resolveDensityClass(['text-[11px]', 'text-xs', 'text-sm', 'text-sm'], densityLevel);
  const mainMetricsText = resolveDensityClass(['text-xs', 'text-sm', 'text-base', 'text-lg'], densityLevel);
  const labelTextSize = resolveDensityClass(['text-[10px]', 'text-xs', 'text-sm', 'text-sm'], densityLevel);
  const valueTextSize = resolveDensityClass(['text-sm', 'text-base', 'text-lg', 'text-lg'], densityLevel);
  const collapsiblePadding = resolveDensityClass(['p-2', 'p-3', 'p-4', 'p-5'], densityLevel);
  const collapsibleSpacing = resolveDensityClass(['space-y-2', 'space-y-3', 'space-y-4', 'space-y-6'], densityLevel);
  const sectionPadding = resolveDensityClass(['p-2', 'p-3', 'p-4', 'p-5'], densityLevel);
  const sectionSpacing = resolveDensityClass(['space-y-2', 'space-y-3', 'space-y-4', 'space-y-6'], densityLevel);
  const gridGap = resolveDensityClass(['gap-2', 'gap-3', 'gap-4', 'gap-6'], densityLevel);
  const materialSpacing = resolveDensityClass(['space-y-2', 'space-y-2', 'space-y-3', 'space-y-4'], densityLevel);
  const materialPadding = resolveDensityClass(['p-2', 'p-3', 'p-4', 'p-5'], densityLevel);
  const materialIconSize = resolveDensityClass(['w-6 h-6', 'w-7 h-7', 'w-8 h-8', 'w-9 h-9'], densityLevel);
  const materialTextSize = resolveDensityClass(['text-xs', 'text-sm', 'text-sm', 'text-base'], densityLevel);
  const insightTextSize = resolveDensityClass(['text-[11px]', 'text-xs', 'text-sm', 'text-sm'], densityLevel);
  const badgeTextSize = resolveDensityClass(['text-[10px]', 'text-xs', 'text-xs', 'text-sm'], densityLevel);
  const badgePadding = resolveDensityClass(['px-1.5 py-0.5', 'px-2 py-1', 'px-2 py-1', 'px-3 py-1'], densityLevel);
  const metricIconSize = resolveDensityClass(['h-4 w-4', 'h-5 w-5', 'h-5 w-5', 'h-5 w-5'], densityLevel);
  const currencySize = resolveDensityClass<CurrencySize>(['xs', 'sm', 'md', 'lg'], densityLevel);
  const showExtendedMeta = densityLevel > 0;
  const showSkillBadge = densityLevel > 1;
  const showOutputQuantity = densityLevel > 1;
  const showUnitBreakdown = densityLevel > 0;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-600/50 overflow-hidden">
      <div
        className={`w-full text-left ${headerPadding} hover:bg-gray-700/30 transition-colors duration-200 cursor-pointer`}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        <div className={`flex items-center justify-between gap-4 ${mainMetricsText}`}>
          <div className={`flex items-center ${headerGap} flex-1`}>
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
                className={`${imageSize} rounded border-2 border-gray-600`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                }}
              />
            </WowheadLink>

            <div className="flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`${titleSize} font-semibold text-white`}>{recipe.name}</h3>
                {showExtendedMeta && (
                  <span className={`${badgePadding} bg-gray-700/50 text-gray-300 ${badgeTextSize} rounded`}>
                    {recipe.category}
                  </span>
                )}
                {showSkillBadge && (
                  <span className={`${badgePadding} bg-blue-900/50 text-blue-300 ${badgeTextSize} rounded`}>
                    Skill level: {recipe.skillLevel}
                  </span>
                )}
              </div>
              <div className={`flex flex-wrap items-center gap-4 mt-1 ${infoTextSize} text-gray-400`}>
                <span className={getQualityColor(recipe.resultItem.quality)}>{recipe.resultItem.quality}</span>
                {showExtendedMeta && <span>iLvl {recipe.resultItem.itemLevel}</span>}
                {showOutputQuantity && <span>Output quantity: {recipe.resultItem.stackSize}</span>}
              </div>
            </div>
          </div>

          <div className={`flex items-center ${metricsGap}`}>
            <div className="text-right">
              <div className={`${labelTextSize} text-gray-400`}>Material cost</div>
              <div>
                <CurrencyAmount
                  amount={totalCost}
                  size={currencySize}
                  className={`${valueTextSize} text-white`}
                />
              </div>
              {hasMissingPrices && (
                <div className="text-[10px] text-yellow-300 mt-1">Missing auction data</div>
              )}
            </div>
            <div className="text-right">
              <div className={`${labelTextSize} text-gray-400`}>Expected sale price</div>
              {sellPriceSource === 'auctionator' && resultUnitPrice !== null ? (
                <>
                  <div>
                    <CurrencyAmount
                      amount={sellPrice}
                      size={currencySize}
                      className={`${valueTextSize} text-white`}
                    />
                  </div>
                  {showUnitBreakdown && (
                    <div className="text-[10px] text-gray-400 mt-1 inline-flex items-center gap-1">
                      <CurrencyAmount
                        amount={resultUnitPrice}
                        size={currencySize}
                        className="text-gray-400"
                      />
                      <span>each (Auctionator)</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-yellow-300 mt-1">Not enough auction data</div>
              )}
            </div>
            <div className="text-right">
              <div className={`${labelTextSize} text-gray-400`}>Profit</div>
              {isCalculable ? (
                <div className={`font-bold flex items-center space-x-1 ${getProfitColor(profit)}`}>
                  {getProfitIcon(profit)}
                  <CurrencyAmount
                    amount={profit}
                    size={currencySize}
                    className={`${valueTextSize} ${getProfitColor(profit)}`}
                  />
                </div>
              ) : (
                <div className="text-[10px] text-yellow-300 mt-1">Unable to calculate</div>
              )}
            </div>
            <div className="text-right">
              <div className={`${labelTextSize} text-gray-400`}>Profit %</div>
              {isCalculable ? (
                <div className={`font-bold ${getProfitColor(profitPercentage)} ${valueTextSize}`}>
                  {profitPercentage > 0 ? '+' : ''}
                  {profitPercentage.toFixed(1)}%
                </div>
              ) : (
                <div className="text-[10px] text-yellow-300 mt-1">Unable to calculate</div>
              )}
            </div>
            <div className="text-right">
              {isExpanded ? (
                <ChevronUp className={`${metricIconSize} text-gray-400`} />
              ) : (
                <ChevronDown className={`${metricIconSize} text-gray-400`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={`${collapsiblePadding} ${collapsibleSpacing} border-t border-gray-700/50 bg-gray-900/40`}>
          <div className={`grid grid-cols-1 lg:grid-cols-3 ${gridGap}`}>
            <div className="lg:col-span-2">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Package className="h-5 w-5 mr-2 text-wow-blue" />
                Reagents
              </h4>
              <div className={materialSpacing}>
                {materialCosts.map((materialCost) => {
                  const recipeMaterial = recipe.materials[materialCost.index];
                  const hasPriceData = materialCost.unitPrice !== null;
                  const totalMaterialCost = hasPriceData
                    ? (materialCost.unitPrice ?? 0) * materialCost.quantity
                    : null;
                  const unitPriceValue = materialCost.unitPrice ?? 0;

                  return (
                    <div
                      key={`${recipeMaterial.item.id}-${materialCost.index}`}
                      className={`flex items-center justify-between bg-gray-800/50 rounded-lg ${materialPadding}`}
                    >
                      <div className="flex items-center space-x-3">
                        <WowheadLink
                          id={recipeMaterial.item.id}
                          type="item"
                          name={recipeMaterial.item.name}
                          icon={recipeMaterial.item.icon}
                          anchorClassName="inline-flex"
                        >
                          <img
                            src={recipeMaterial.item.icon}
                            alt={recipeMaterial.item.name}
                            className={`${materialIconSize} rounded border border-gray-600`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                            }}
                          />
                        </WowheadLink>
                        <div>
                          <div className="text-white font-medium">{recipeMaterial.item.name}</div>
                          <div className={`${materialTextSize} ${getQualityColor(recipeMaterial.item.quality)}`}>
                            {recipeMaterial.item.quality}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`${valueTextSize} text-white font-medium`}>
                          {materialCost.quantity}x
                        </div>
                        {hasPriceData ? (
                          <div className="flex flex-col items-end gap-1">
                            {showUnitBreakdown && (
                              <div className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                                <CurrencyAmount
                                  amount={unitPriceValue}
                                  size={currencySize}
                                  className="text-gray-400"
                                />
                                <span>each</span>
                              </div>
                            )}
                            {totalMaterialCost !== null && (
                              <CurrencyAmount
                                amount={totalMaterialCost}
                                size={currencySize}
                                className="text-[11px] text-gray-300"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-yellow-300">No auction data</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2 text-wow-purple" />
                Profit breakdown
              </h4>
              <div className={sectionSpacing}>
                <div className={`bg-gray-800/50 rounded-lg ${sectionPadding}`}>
                  <div className={`grid grid-cols-2 ${gridGap}`}>
                    <div>
                      <div className={`${labelTextSize} text-gray-400`}>Total material cost</div>
                      <CurrencyAmount
                        amount={totalCost}
                        size={currencySize}
                        className={`${valueTextSize} text-white`}
                      />
                      {hasMissingPrices && (
                        <div className="text-[10px] text-yellow-300 mt-1">
                          Incomplete data for some reagents
                        </div>
                      )}
                    </div>
                    <div>
                      <div className={`${labelTextSize} text-gray-400`}>Expected sale price</div>
                      {sellPriceSource === 'auctionator' && resultUnitPrice !== null ? (
                        <CurrencyAmount
                          amount={sellPrice}
                          size={currencySize}
                          className={`${valueTextSize} text-white`}
                        />
                      ) : (
                        <div className="text-[10px] text-yellow-300 mt-1">
                          Not enough auction data
                        </div>
                      )}
                    </div>
                    <div>
                      <div className={`${labelTextSize} text-gray-400`}>Net profit</div>
                      {isCalculable ? (
                        <CurrencyAmount
                          amount={profit}
                          size={currencySize}
                          className={`font-bold ${getProfitColor(profit)} ${valueTextSize}`}
                          showSign
                        />
                      ) : (
                        <div className="text-[10px] text-yellow-300 mt-1">Unable to calculate</div>
                      )}
                    </div>
                    <div>
                      <div className={`${labelTextSize} text-gray-400`}>ROI</div>
                      {isCalculable ? (
                        <div className={`font-bold ${getProfitColor(roi)} ${valueTextSize}`}>
                          {roi > 0 ? '+' : ''}
                          {roi.toFixed(1)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-yellow-300 mt-1">Unable to calculate</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`bg-gray-800/50 rounded-lg ${sectionPadding}`}>
                  <div className="text-sm text-gray-400 mb-2">Insight</div>
                  {isCalculable ? (
                    profit > 0 ? (
                      <div className={`text-green-400 ${insightTextSize}`}>
                        Crafting is profitable. ROI: {roi.toFixed(1)}%
                      </div>
                    ) : profit < 0 ? (
                      <div className={`text-red-400 ${insightTextSize}`}>
                        Crafting loses gold. Consider sourcing cheaper reagents or selling the inputs.
                      </div>
                    ) : (
                      <div className={`text-yellow-400 ${insightTextSize}`}>
                        Crafting breaks even. Small market changes may swing this recipe either way.
                      </div>
                    )
                  ) : (
                    <div className={`text-yellow-300 ${insightTextSize}`}>
                      Not enough auction data to evaluate this recipe right now.
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
