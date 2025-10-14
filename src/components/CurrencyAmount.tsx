import React from 'react';

type CoinType = 'gold' | 'silver' | 'copper';

export type CurrencySize = 'xs' | 'sm' | 'md' | 'lg';

interface CurrencyAmountProps {
  amount: number;
  size?: CurrencySize;
  showSign?: boolean;
  className?: string;
  gapClassName?: string;
}

const COIN_COLORS: Record<CoinType, { fill: string; border: string }> = {
  gold: { fill: 'bg-[#d4af37]', border: 'border-[#b38c1e]' },
  silver: { fill: 'bg-[#c0c0c0]', border: 'border-[#9c9c9c]' },
  copper: { fill: 'bg-[#b87333]', border: 'border-[#95501f]' }
};

const COIN_SIZE_CLASSES: Record<CurrencySize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-[14px] h-[14px]',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

const GAP_CLASSES: Record<CurrencySize, string> = {
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5'
};

const NUMBER_SIZE_CLASSES: Record<CurrencySize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

const CoinIcon: React.FC<{ type: CoinType; size: CurrencySize }> = ({ type, size }) => {
  const { fill, border } = COIN_COLORS[type];
  return (
    <span
      className={`inline-block rounded-full border ${fill} ${border} shadow-sm ${COIN_SIZE_CLASSES[size]}`}
      aria-hidden
    />
  );
};

export const CurrencyAmount: React.FC<CurrencyAmountProps> = ({
  amount,
  size = 'md',
  showSign = false,
  className = '',
  gapClassName
}) => {
  const rounded = Math.round(amount);
  const absolute = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : rounded > 0 ? '+' : '';

  const gold = Math.floor(absolute / 10000);
  const silver = Math.floor((absolute % 10000) / 100);
  const copper = absolute % 100;

  const parts: Array<{ value: number; type: CoinType }> = [];

  if (gold > 0) {
    parts.push({ value: gold, type: 'gold' });
  }

  if (silver > 0 || (gold > 0 && copper > 0)) {
    parts.push({ value: silver, type: 'silver' });
  }

  if (copper > 0 || parts.length === 0) {
    parts.push({ value: copper, type: 'copper' });
  }

  return (
    <span
      className={`inline-flex items-center ${gapClassName ?? GAP_CLASSES[size]} ${className}`.trim()}
    >
      {showSign && sign && <span>{sign}</span>}
      {parts.map((part, index) => (
        <span key={`${part.type}-${index}`} className="inline-flex items-center gap-1">
          <CoinIcon type={part.type} size={size} />
          <span className={`font-medium ${NUMBER_SIZE_CLASSES[size]}`}>
            {part.value.toLocaleString()}
          </span>
        </span>
      ))}
    </span>
  );
};
