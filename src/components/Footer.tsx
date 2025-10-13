import React from "react";
import { Heart, Github, ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-sm border-t border-yellow-500/20 mt-8">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-base font-semibold text-white mb-3">О проекте</h3>
            <p className="text-gray-400 text-sm mb-3 leading-relaxed">
              WoW WotLK Crafting Monitor — небольшой помощник для расчёта стоимости и прибыли от крафта в Wrath of the Lich King. Данные берутся из локальных дампов клиента и Wowhead.
            </p>
            <div className="flex items-center space-x-2 text-wow-gold text-xs">
              <Heart className="h-4 w-4" />
              <span>Сделано с любовью к theorycraft и экономике WoW.</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white mb-3">Полезные ссылки</h3>
            <div className="space-y-2 text-sm">
              <a
                href="https://www.wowhead.com/wotlk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-wow-blue transition-colors duration-200"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Wowhead: WotLK</span>
              </a>
              <a
                href="https://www.curseforge.com/wow/addons/auctionator"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-wow-blue transition-colors duration-200"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Auctionator Addon</span>
              </a>
              <a
                href="https://worldofwarcraft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-wow-blue transition-colors duration-200"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Официальный сайт WoW</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-white mb-3">Технологии</h3>
            <div className="space-y-1 text-sm text-gray-400">
              <div>Версия приложения: 1.0.0</div>
              <div>React + TypeScript</div>
              <div>Tailwind CSS</div>
              <div>Lucide Icons</div>
            </div>
            <div className="mt-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-wow-blue transition-colors duration-200 text-sm"
              >
                <Github className="h-4 w-4" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600/50 mt-4 pt-4 text-center">
          <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
            © 2024 WoW WotLK Crafting Monitor. Все торговые марки принадлежат Blizzard Entertainment.
          </p>
        </div>
      </div>
    </footer>
  );
};