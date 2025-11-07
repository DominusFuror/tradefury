import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Star } from 'lucide-react';
import { Profession } from '../types';

interface ProfessionSelectorProps {
  selectedProfession: number | null;
  onProfessionChange: (professionId: number) => void;
  professions: Profession[];
}

export const ProfessionSelector: React.FC<ProfessionSelectorProps> = ({
  selectedProfession,
  onProfessionChange,
  professions
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const selected = useMemo(
    () => professions.find((profession) => profession.id === selectedProfession) ?? null,
    [professions, selectedProfession]
  );

  const handleSelect = (professionId: number) => {
    onProfessionChange(professionId);
    setIsOpen(false);
  };

  const updateDropdownPosition = useCallback(() => {
    const toggle = toggleRef.current;
    if (!toggle) {
      return;
    }
    const rect = toggle.getBoundingClientRect();
    setDropdownStyle({
      position: 'absolute',
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
      zIndex: 9999
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();

    const handleScrollOrResize = () => updateDropdownPosition();

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateDropdownPosition]);

  return (
    <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg p-4 border border-[#24252b]">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Star className="h-5 w-5 mr-2 text-wow-purple" />
        Select a Profession
      </h3>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="w-full flex items-center justify-between bg-[#1a1b21]/80 hover:bg-[#22232a]/80 border border-[#2e3036] rounded-lg px-4 py-3 text-left transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          ref={toggleRef}
          disabled={professions.length === 0}
        >
          <div className="flex items-center space-x-3">
            {selected ? (
              <>
                <img
                  src={selected.icon}
                  alt={`${selected.name} icon`}
                  className="w-10 h-10 rounded-sm object-contain bg-[#1a1b21]/60 p-1"
                  loading="lazy"
                />
                <div>
                  <div className="text-white font-medium">{selected.name}</div>
                  <div className="text-sm text-gray-400">Max rank: {selected.maxLevel}</div>
                </div>
              </>
            ) : (
              <span className="text-gray-400">
                {professions.length === 0 ? 'No professions available' : 'Choose a profession'}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && professions.length > 0 && (
          createPortal(
            <div
              className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
              style={dropdownStyle ?? undefined}
            >
              {professions.map((profession) => (
                <button
                  key={profession.id}
                  type="button"
                  onClick={() => handleSelect(profession.id)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#1a1b21]/80 transition-colors duration-200 text-left border-b border-gray-700/50 last:border-b-0"
                >
                  <img
                    src={profession.icon}
                    alt={`${profession.name} icon`}
                    className="w-10 h-10 rounded-sm object-contain bg-[#1a1b21]/60 p-1"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{profession.name}</div>
                    <div className="text-sm text-gray-400">Max rank: {profession.maxLevel}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {profession.categories.slice(0, 3).join(', ')}
                      {profession.categories.length > 3 && '...'}
                    </div>
                  </div>
                </button>
              ))}
            </div>,
            document.body
          )
        )}
      </div>

      {selected && (
        <div className="mt-4">
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
              <span className="text-sm font-medium">Primary categories</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selected.categories.map((category, index) => (
                <span
                  key={`${selected.id}-category-${index}`}
                  className="px-2 py-1 bg-[#1a1b21]/80 text-gray-300 text-xs rounded"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

