import React from 'react';
import { X, Package, Target } from 'lucide-react';
import { CraftingProfit, Item } from '../types';
import { PriceHistoryEntry } from '../services/AuctionatorDataService';
import { CurrencyAmount } from './CurrencyAmount';
import { WowheadLink } from './WowheadLink';

interface ItemDetailsModalProps {
  item: Item;
  history: PriceHistoryEntry[];
  asResult: CraftingProfit | null;
  usedIn: CraftingProfit[];
  onClose: () => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item,
  history,
  asResult,
  usedIn,
  onClose
}) => {
  const latestPrice = history.length > 0 ? history[0].price : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#24252b] bg-[#0d0d11] shadow-xl">
        <div className="flex items-start justify-between border-b border-[#2c2d34] p-5 bg-[#111216]">
          <div className="flex items-center gap-4">
            <img
              src={item.icon}
              alt={item.name}
              className="w-16 h-16 rounded-lg border border-[#2c2d34]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
              }}
            />
            <div>
              <h2 className="text-2xl font-semibold text-white">{item.name}</h2>
              <p className="text-sm text-gray-400">Item ID: {item.id}</p>
              {latestPrice !== null && (
                <div className="mt-1 text-sm text-gray-300">
                  Latest price: <CurrencyAmount amount={latestPrice} size="sm" />
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2c2d34] bg-[#1a1b21]/80 text-gray-300 hover:text-white hover:bg-[#22232a]/90 transition-colors"
            aria-label="Close item details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 overflow-y-auto max-h-[70vh] bg-[#0f1014]">
          <section className="rounded-lg border border-[#2c2d34] bg-[#15161c] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Target className="h-4 w-4 text-wow-purple" /> Price history
            </div>
            {history.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {history.map((entry, index) => (
                  <div
                    key={`item-history-${entry.importedAt}-${index}`}
                    className="flex items-center justify-between text-[13px] text-gray-300"
                  >
                    <span>{new Date(entry.importedAt).toLocaleString()}</span>
                    <CurrencyAmount amount={entry.price} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">No recorded prices yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-[#2c2d34] bg-[#15161c] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Package className="h-4 w-4 text-wow-blue" /> Crafted via
            </div>
            {asResult ? (
              <div className="space-y-3 text-sm text-gray-300">
                <div>
                  <WowheadLink
                    id={asResult.recipe.id}
                    type="spell"
                    name={asResult.recipe.name}
                    icon={asResult.recipe.resultItem.icon}
                    anchorClassName="inline-flex items-center gap-2"
                  >
                    <img
                      src={asResult.recipe.resultItem.icon}
                      alt={asResult.recipe.name}
                      className="h-6 w-6 rounded border border-[#2c2d34]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                      }}
                    />
                    <span className="text-white font-medium">{asResult.recipe.name}</span>
                  </WowheadLink>
                </div>
                <div className="text-xs text-gray-400">Skill level: {asResult.recipe.skillLevel}</div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Reagents</p>
                  {asResult.recipe.materials.map((material) => (
                    <div key={material.item.id} className="flex items-center justify-between text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <img
                          src={material.item.icon}
                          alt={material.item.name}
                          className="h-5 w-5 rounded border border-[#2c2d34]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                          }}
                        />
                        <span>{material.item.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">x{material.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">No known recipe crafts this item directly.</p>
            )}
          </section>

          <section className="lg:col-span-2 rounded-lg border border-[#2c2d34] bg-[#15161c] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Package className="h-4 w-4 text-wow-gold" /> Used in recipes
            </div>
            {usedIn.length > 0 ? (
              <div className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
                {usedIn.map((usage) => (
                  <div key={usage.recipe.id} className="rounded border border-[#2c2d34] bg-[#111216]/80 p-3">
                    <WowheadLink
                      id={usage.recipe.id}
                      type="spell"
                      name={usage.recipe.name}
                      icon={usage.recipe.resultItem.icon}
                      anchorClassName="inline-flex items-center gap-2 mb-2"
                    >
                      <img
                        src={usage.recipe.resultItem.icon}
                        alt={usage.recipe.name}
                        className="h-5 w-5 rounded border border-[#2c2d34]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                        }}
                      />
                      <span className="text-white font-medium">{usage.recipe.name}</span>
                    </WowheadLink>
                    <p className="text-xs text-gray-400">Profession: {usage.recipe.profession.name}</p>
                    <p className="text-xs text-gray-400">Skill level: {usage.recipe.skillLevel}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">This item is not used as a reagent in the visible recipes.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
