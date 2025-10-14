import React from "react";
import { Heart, Github, ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-sm border-t border-yellow-500/20 mt-8">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
          <div>
            <p className="text-white font-semibold mb-1">WoW WotLK Crafting Monitor</p>
            <p className="text-gray-400 text-xs md:text-sm">
              Local-first helper for Wrath of the Lich King professions and crafting economics.
            </p>
            <div className="mt-2 flex items-center space-x-2 text-wow-gold text-xs">
              <Heart className="h-3.5 w-3.5" />
              <span>Crafted with a love for theorycraft and spreadsheets.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-400">
            <a
              href="https://www.wowhead.com/wotlk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-wow-blue transition-colors duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Wowhead</span>
            </a>
            <a
              href="https://www.curseforge.com/wow/addons/auctionator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-wow-blue transition-colors duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Auctionator</span>
            </a>
            <a
              href="https://worldofwarcraft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-wow-blue transition-colors duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              <span>World of Warcraft</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:text-wow-blue transition-colors duration-200"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="border-t border-gray-600/40 mt-3 pt-3 text-center text-[11px] md:text-xs text-gray-500 leading-relaxed">
          Copyright 2024 WoW WotLK Crafting Monitor. World of Warcraft is a trademark of Blizzard Entertainment.
        </div>
      </div>
    </footer>
  );
};
