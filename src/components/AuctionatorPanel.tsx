import React, { useRef } from 'react';
import { UploadCloud, Loader2, Trash2 } from 'lucide-react';
import { AuctionatorMetadata } from '../hooks/useAuctionatorData';

interface AuctionatorPanelProps {
  metadata: AuctionatorMetadata | null;
  isLoading: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

export const AuctionatorPanel: React.FC<AuctionatorPanelProps> = ({
  metadata,
  isLoading,
  error,
  onFileSelected,
  onClear
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-[#111216]/85 backdrop-blur-sm rounded-lg border border-[#24252b] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Auctionator Prices</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 bg-wow-gold/20 hover:bg-wow-gold/30 text-wow-gold border border-wow-gold/40 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          <span>{isLoading ? 'Importing...' : 'Import Auctionator.lua'}</span>
        </button>
        <input
          type="file"
          accept=".lua"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {metadata ? (
        <div className="bg-[#16171d]/85 border border-[#2c2d34] rounded-md p-3 text-sm text-gray-300 space-y-1">
          <div>
            <span className="text-gray-400">Source:</span>{' '}
            <span className="font-medium text-white">{metadata.source}</span>
          </div>
          <div>
            <span className="text-gray-400">Imported:</span>{' '}
            <span className="font-medium text-white">{formatTimestamp(metadata.importedAt)}</span>
          </div>
          <div>
            <span className="text-gray-400">Items with prices:</span>{' '}
            <span className="font-medium text-white">{metadata.itemCount}</span>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="mt-2 inline-flex items-center space-x-2 text-xs text-red-300 hover:text-red-200 transition-colors duration-150"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear imported data</span>
          </button>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">
          Import your Auctionator.lua file to use live auction prices for crafting cost and profit calculations.
        </p>
      )}

      {error && (
        <div className="mt-3 bg-red-900/40 border border-red-500/50 text-red-200 text-sm px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};
