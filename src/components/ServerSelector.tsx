import React, { useState } from 'react';
import { ChevronDown, Server, Users } from 'lucide-react';
import { ServerInfo } from '../types';

interface ServerSelectorProps {
  selectedServer: ServerInfo | null;
  onServerChange: (server: ServerInfo) => void;
}

const SAMPLE_SERVERS: ServerInfo[] = [
  { name: 'Icecrown', region: 'EU', faction: 'Alliance', lastUpdated: new Date() },
  { name: 'Lordaeron', region: 'EU', faction: 'Alliance', lastUpdated: new Date() },
  { name: 'Chromie', region: 'EU', faction: 'Horde', lastUpdated: new Date() },
  { name: 'Frostmourne', region: 'US', faction: 'Alliance', lastUpdated: new Date() },
  { name: 'Warmane', region: 'EU', faction: 'Horde', lastUpdated: new Date() }
];

const FACTION_LABEL: Record<ServerInfo['faction'], string> = {
  Alliance: 'Альянс',
  Horde: 'Орда'
};

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  selectedServer,
  onServerChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderFactionBadge = (faction: ServerInfo['faction']) => (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${faction === 'Alliance' ? 'bg-blue-900/40 text-blue-300' : 'bg-red-900/40 text-red-300'}`}>
      {FACTION_LABEL[faction]}
    </span>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Server className="h-5 w-5 mr-2 text-wow-blue" />
        Выбор сервера
      </h3>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-gray-700/50 hover:bg-gray-600/50 border border-gray-500/50 rounded-lg px-4 py-3 text-left transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            {selectedServer ? (
              <>
                <div>
                  <div className="text-white font-medium">{selectedServer.name}</div>
                  <div className="text-sm text-gray-400 flex items-center space-x-2">
                    <span>{selectedServer.region}</span>
                    {renderFactionBadge(selectedServer.faction)}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-gray-400">Выберите сервер</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
            {SAMPLE_SERVERS.map((server) => (
              <button
                key={`${server.name}-${server.faction}`}
                onClick={() => {
                  onServerChange(server);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors duration-200 text-left"
              >
                <div>
                  <div className="text-white font-medium">{server.name}</div>
                  <div className="text-sm text-gray-400 flex items-center space-x-2">
                    <span>{server.region}</span>
                    {renderFactionBadge(server.faction)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedServer && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-green-400">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Сервер сохранён в настройках</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Последнее обновление данных: {selectedServer.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

