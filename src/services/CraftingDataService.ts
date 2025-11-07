import { gameDataRepository, SpellRecord } from './GameDataRepository';
import { Item, ItemQuality, Profession, Recipe, RecipeMaterial } from '../types';
import { ItemNameResolver } from './ItemNameResolver';

const DEFAULT_ITEM_LEVEL = 0;
const DEFAULT_ITEM_QUALITY: ItemQuality = 'Common';

const itemCache = new Map<number, Item>();
const recipeCache = new Map<number, Recipe[]>();

ItemNameResolver.addListener(({ id, name }) => {
  const cachedItem = itemCache.get(id);
  if (cachedItem && cachedItem.name !== name) {
    itemCache.set(id, {
      ...cachedItem,
      name
    });
  }

  recipeCache.forEach((recipes, professionId) => {
    let cacheUpdated = false;
    const updatedRecipes = recipes.map((recipe) => {
      let recipeChanged = false;
      let resultItem = recipe.resultItem;

      if (resultItem.id === id && resultItem.name !== name) {
        resultItem = {
          ...resultItem,
          name
        };
        recipeChanged = true;
      }

      let materials = recipe.materials;
      let materialsChanged = false;
      const normalizedMaterials = materials.map((material) => {
        if (material.item.id === id && material.item.name !== name) {
          materialsChanged = true;
          return {
            ...material,
            item: {
              ...material.item,
              name
            }
          };
        }
        return material;
      });

      if (materialsChanged) {
        materials = normalizedMaterials;
        recipeChanged = true;
      }

      if (recipeChanged) {
        cacheUpdated = true;
        return {
          ...recipe,
          resultItem,
          materials
        };
      }

      return recipe;
    });

    if (cacheUpdated) {
      recipeCache.set(professionId, updatedRecipes);
    }
  });
});

const ensureRepositoryLoaded = async (): Promise<void> => {
  await gameDataRepository.load();
};

const resolveItemName = (itemId: number): string => {
  const repositoryName = gameDataRepository.getItemName(itemId);
  if (repositoryName) {
    return repositoryName;
  }

  return `Item #${itemId}`;
};

const cloneItem = (item: Item, overrides: Partial<Item> = {}): Item => ({
  ...item,
  ...overrides
});

const getBaseItem = (itemId: number): Item => {
  const cachedItem = itemCache.get(itemId);
  if (cachedItem) {
    return cachedItem;
  }

  const icon = gameDataRepository.getItemIconUrl(itemId);
  const item: Item = {
    id: itemId,
    name: resolveItemName(itemId),
    icon,
    quality: DEFAULT_ITEM_QUALITY,
    itemLevel: DEFAULT_ITEM_LEVEL,
    sellPrice: 0,
    stackSize: 1
  };

  itemCache.set(itemId, item);
  return item;
};

const mapSpellToRecipe = (spell: SpellRecord, profession: Profession): Recipe | null => {
  if (!spell.resultItemId) {
    return null;
  }

  const resultBase = getBaseItem(spell.resultItemId);
  const resultItem = cloneItem(resultBase, {
    stackSize: spell.resultItemQuantity,
    name: resolveItemName(spell.resultItemId)
  });

  const materials: RecipeMaterial[] = spell.reagents.map((reagent) => {
    const baseItem = getBaseItem(reagent.itemId);
    return {
      item: cloneItem(baseItem),
      quantity: reagent.quantity
    };
  });

  return {
    id: spell.spellId,
    name: spell.name,
    profession,
    skillLevel: spell.minSkill,
    maxSkillLevel: spell.maxSkill,
    trivialSkillLow: spell.trivialSkillLow,
    trivialSkillHigh: spell.trivialSkillHigh,
    resultItem,
    materials,
    category: profession.categories[0] ?? 'General',
    isLearned: spell.minSkill > 0
  };
};

const sortRecipes = (recipes: Recipe[]): Recipe[] => {
  return [...recipes].sort((a, b) => {
    if (a.skillLevel !== b.skillLevel) {
      return a.skillLevel - b.skillLevel;
    }
    return a.name.localeCompare(b.name);
  });
};

export const CraftingDataService = {
  async load(): Promise<void> {
    await ensureRepositoryLoaded();
  },

  async getSupportedProfessionIds(): Promise<number[]> {
    await ensureRepositoryLoaded();
    return gameDataRepository.getAvailableProfessionIds();
  },

  async getRecipesForProfession(profession: Profession): Promise<Recipe[]> {
    await ensureRepositoryLoaded();

    if (recipeCache.has(profession.id)) {
      return recipeCache.get(profession.id) ?? [];
    }

    const spellRecords = gameDataRepository.getRecipesByProfession(profession.id);
    const recipes = spellRecords
      .map((spell) => mapSpellToRecipe(spell, profession))
      .filter((recipe): recipe is Recipe => Boolean(recipe));

    const sortedRecipes = sortRecipes(recipes);
    recipeCache.set(profession.id, sortedRecipes);

    return sortedRecipes;
  }
};
