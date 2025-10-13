import { useEffect, useState } from 'react';
import { CraftingDataService } from '../services/CraftingDataService';
import { Profession, Recipe } from '../types';

interface UseProfessionRecipesState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UseProfessionRecipesState = {
  recipes: [],
  isLoading: false,
  error: null
};

export const useProfessionRecipes = (profession: Profession | null) => {
  const [state, setState] = useState<UseProfessionRecipesState>(initialState);

  useEffect(() => {
    let isCancelled = false;

    if (!profession) {
      setState(initialState);
      return () => {
        isCancelled = true;
      };
    }

    const loadRecipes = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      try {
        const recipes = await CraftingDataService.getRecipesForProfession(profession);
        if (!isCancelled) {
          setState({
            recipes,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Failed to load recipes for profession', profession.id, error);
        if (!isCancelled) {
          setState({
            recipes: [],
            isLoading: false,
            error: 'Failed to load recipes for the selected profession.'
          });
        }
      }
    };

    loadRecipes();

    return () => {
      isCancelled = true;
    };
  }, [profession]);

  return state;
};
