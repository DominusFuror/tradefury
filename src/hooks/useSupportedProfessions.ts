import { useEffect, useState } from 'react';
import { CraftingDataService } from '../services/CraftingDataService';
import { Profession, PROFESSIONS } from '../types';

interface UseSupportedProfessionsState {
  professions: Profession[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UseSupportedProfessionsState = {
  professions: [],
  isLoading: true,
  error: null
};

export const useSupportedProfessions = (): UseSupportedProfessionsState => {
  const [state, setState] = useState<UseSupportedProfessionsState>(initialState);

  useEffect(() => {
    let isCancelled = false;

    const loadSupportedProfessions = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      try {
        const supportedIds = await CraftingDataService.getSupportedProfessionIds();
        if (isCancelled) {
          return;
        }

        const filteredProfessions = PROFESSIONS.filter((profession) =>
          supportedIds.includes(profession.id)
        );

        setState({
          professions: filteredProfessions,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Failed to load supported professions', error);

        if (!isCancelled) {
          setState({
            professions: [],
            isLoading: false,
            error: 'Failed to load the list of professions.'
          });
        }
      }
    };

    loadSupportedProfessions();

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
};
