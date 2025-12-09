import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ProfessionSelector } from './components/ProfessionSelector';
import { CraftingList } from './components/CraftingList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { PersistentStorage } from './services/api';
import { useSupportedProfessions } from './hooks/useSupportedProfessions';
import { useAuctionatorData } from './hooks/useAuctionatorData';
import { AuctionatorPanel } from './components/AuctionatorPanel';
import { ItemNameMappingPanel } from './components/ItemNameMappingPanel';

const REFRESH_DELAY_MS = 1000;
const PREFERENCES_KEY = 'selectedProfessionId';

function App() {
  const [selectedProfessionId, setSelectedProfessionId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const preferencesRef = useRef<Record<string, unknown>>({});

  const {
    professions,
    isLoading: professionsLoading,
    error: professionsError
  } = useSupportedProfessions();
  const auctionator = useAuctionatorData();

  useEffect(() => {
    let isCancelled = false;

    const loadPreferences = async () => {
      try {
        const preferences = await PersistentStorage.getUserPreferences();
        if (isCancelled) {
          return;
        }
        const savedProfession = preferences?.[PREFERENCES_KEY];
        preferencesRef.current = preferences;

        if (typeof savedProfession === 'number') {
          setSelectedProfessionId(savedProfession);
        }
      } catch (error) {
        console.warn('Failed to load stored user preferences', error);
      }
    };

    loadPreferences();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedProfessionId === null) {
      return;
    }

    const professionExists = professions.some(
      (profession) => profession.id === selectedProfessionId
    );

    if (!professionExists) {
      setSelectedProfessionId(null);
    }
  }, [professions, selectedProfessionId]);

  const selectedProfession = useMemo(
    () => professions.find((profession) => profession.id === selectedProfessionId) ?? null,
    [professions, selectedProfessionId]
  );

  const handleProfessionChange = (professionId: number) => {
    setSelectedProfessionId(professionId);
    setRefreshError(null);

    (async () => {
      try {
        preferencesRef.current = {
          ...preferencesRef.current,
          [PREFERENCES_KEY]: professionId
        };
        await PersistentStorage.saveUserPreferences(preferencesRef.current);
      } catch (error) {
        console.warn('Failed to persist updated preferences', error);
      }
    })();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      // Перезагружаем данные с сервера
      const data = await auctionator.reload();
      if (!data) {
        setRefreshError('No price data available. Please upload an Auctionator.lua file first.');
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setRefreshError('Failed to refresh data from server. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#070708] via-[#0d0d10] to-[#15161a]">
        <Header onRefresh={handleRefresh} isLoading={isRefreshing} />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <AuctionatorPanel
                metadata={auctionator.metadata}
                isLoading={auctionator.isLoading}
                error={auctionator.error}
                onFileSelected={auctionator.handleFileSelection}
                onClear={auctionator.clear}
                priceHistory={auctionator.priceHistory}
              />
              <ProfessionSelector
                selectedProfession={selectedProfessionId}
                onProfessionChange={handleProfessionChange}
                professions={professions}
              />
              <ItemNameMappingPanel />

              {professionsLoading && (
                <div className="bg-[#121217]/80 border border-[#2a2b31] text-gray-300 px-4 py-3 rounded-lg">
                  Loading profession data...
                </div>
              )}

              {professionsError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                  {professionsError}
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              {refreshError && (
                <div className="bg-[#2a1313] border border-red-600/70 text-red-200 px-4 py-3 rounded-lg mb-6">
                  {refreshError}
                </div>
              )}

              {!selectedProfession && (
                <div className="bg-[#141518]/85 border border-[#2a2b31] text-gray-200 px-6 py-8 rounded-lg text-center">
                  <h3 className="text-xl font-bold mb-2 text-white">Welcome to the WotLK Crafting Monitor</h3>
                  <p className="text-gray-300">
                    Pick a profession on the left to explore its crafting recipes. Data is sourced
                    directly from the local CSV exports of the Wrath of the Lich King client.
                  </p>
                </div>
              )}

              {selectedProfession && (
                <ErrorBoundary>
                  <CraftingList
                    profession={selectedProfession}
                    isRefreshing={isRefreshing}
                    priceMap={auctionator.priceMap}
                    priceHistory={auctionator.priceHistory}
                    hasPriceData={auctionator.hasData}
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
