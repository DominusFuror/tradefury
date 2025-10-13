import React, { useState } from 'react';

type WowheadEntityType = 'item' | 'spell';

interface WowheadLinkProps {
  id: number;
  type: WowheadEntityType;
  name: string;
  icon: string;
  children: React.ReactNode;
  wrapperClassName?: string;
  anchorClassName?: string;
  tooltipPlacement?: 'top' | 'bottom';
}

const WOWHEAD_BASE_URL: Record<WowheadEntityType, string> = {
  item: 'https://wotlk.wowhead.com/item=',
  spell: 'https://wotlk.wowhead.com/spell='
};

export const WowheadLink: React.FC<WowheadLinkProps> = ({
  id,
  type,
  name,
  icon,
  children,
  wrapperClassName,
  anchorClassName,
  tooltipPlacement = 'top'
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleMouseEnter = () => setIsTooltipVisible(true);
  const handleMouseLeave = () => setIsTooltipVisible(false);
  const handleFocus = () => setIsTooltipVisible(true);
  const handleBlur = () => setIsTooltipVisible(false);
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const href = `${WOWHEAD_BASE_URL[type]}${id}`;

  const wrapperClasses = ['relative', wrapperClassName].filter(Boolean).join(' ');
  const anchorClasses = ['inline-flex focus:outline-none focus:ring-2 focus:ring-wow-blue/60 rounded', anchorClassName]
    .filter(Boolean)
    .join(' ');

  const tooltipPositionClasses =
    tooltipPlacement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';

  return (
    <div
      className={wrapperClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={anchorClasses}
        aria-label={`${name} — open on Wowhead`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
      >
        {children}
      </a>
      {isTooltipVisible && (
        <div
          className={`pointer-events-none absolute ${tooltipPositionClasses} left-1/2 -translate-x-1/2 z-40`}
          role="tooltip"
        >
          <div className="rounded-lg bg-gray-900/95 border border-gray-600/80 px-3 py-2 shadow-xl min-w-[12rem]">
            <div className="flex items-center space-x-3">
              <img
                src={icon}
                alt={name}
                className="w-8 h-8 rounded border border-gray-700 shadow-sm"
              />
              <span className="text-sm font-medium text-white leading-tight">{name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
