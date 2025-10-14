import React from 'react';
import { RefreshCw, Crown } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isLoading }) => {
  return (
    <header className="bg-[#09090c]/80 backdrop-blur-sm border-b border-[#26272d]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-wow-gold wow-text-glow" />
            <div>
              <h1 className="text-2xl font-bold text-white font-wow wow-text-glow">
                WoW WotLK Crafting Monitor
              </h1>
              <p className="text-gray-300 text-sm">
                Отслеживание цен и выгоды ремёсел в Wrath of the Lich King
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-wow-gold/20 hover:bg-wow-gold/30 text-wow-gold border border-wow-gold/50 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Обновить</span>
          </button>
        </div>
      </div>
    </header>
  );
};


