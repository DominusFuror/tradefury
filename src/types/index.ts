export type ItemQuality =
  | 'Poor'
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Artifact';

export interface Item {
  id: number;
  name: string;
  icon: string;
  quality: ItemQuality;
  itemLevel: number;
  sellPrice?: number;
  buyPrice?: number;
  stackSize: number;
}

export interface RecipeMaterial {
  item: Item;
  quantity: number;
}

export type PriceSource = 'auctionator' | 'unavailable';

export interface MaterialCostInfo {
  index: number;
  itemId: number;
  quantity: number;
  unitPrice: number | null;
  source: PriceSource;
}

export interface Profession {
  id: number;
  name: string;
  icon: string;
  maxLevel: number;
  categories: string[];
}

export interface Recipe {
  id: number;
  name: string;
  profession: Profession;
  skillLevel: number;
  resultItem: Item;
  materials: RecipeMaterial[];
  category: string;
  isLearned?: boolean;
}

export interface AuctionData {
  itemId: number;
  server: string;
  faction: 'Alliance' | 'Horde';
  minBuyout: number;
  medianPrice: number;
  lastUpdated: Date;
  quantity: number;
}

export interface CraftingProfit {
  recipe: Recipe;
  totalCost: number;
  sellPrice: number;
  resultUnitPrice: number | null;
  sellPriceSource: PriceSource;
  profit: number;
  profitPercentage: number;
  roi: number;
  materialCosts: MaterialCostInfo[];
  hasMissingPrices: boolean;
  isCalculable: boolean;
}

export interface ServerInfo {
  name: string;
  region: string;
  faction: 'Alliance' | 'Horde';
  lastUpdated: Date;
}

export const PROFESSIONS: Profession[] = [
  {
    id: 171,
    name: 'Alchemy',
    icon: 'ALC',
    maxLevel: 450,
    categories: ['Transmute', 'Elixirs', 'Flasks', 'Potions']
  },
  {
    id: 164,
    name: 'Blacksmithing',
    icon: 'BSM',
    maxLevel: 450,
    categories: ['Armor', 'Weapons', 'Enhancements', 'Shields']
  },
  {
    id: 333,
    name: 'Enchanting',
    icon: 'ENC',
    maxLevel: 450,
    categories: ['Weapon Enchants', 'Armor Enchants', 'Scrolls', 'Wands']
  },
  {
    id: 202,
    name: 'Engineering',
    icon: 'ENG',
    maxLevel: 450,
    categories: ['Gadgets', 'Bombs', 'Scopes', 'Armor']
  },
  {
    id: 773,
    name: 'Inscription',
    icon: 'INS',
    maxLevel: 450,
    categories: ['Glyphs', 'Scrolls', 'Darkmoon Cards', 'Off-hand']
  },
  {
    id: 755,
    name: 'Jewelcrafting',
    icon: 'JWL',
    maxLevel: 450,
    categories: ['Gem Cuts', 'Meta Gems', 'Figurines', 'Prismatic']
  },
  {
    id: 165,
    name: 'Leatherworking',
    icon: 'LWK',
    maxLevel: 450,
    categories: ['Leather Armor', 'Mail Armor', 'Drums', 'Armorkits']
  },
  {
    id: 197,
    name: 'Tailoring',
    icon: 'TAL',
    maxLevel: 450,
    categories: ['Cloth Armor', 'Bags', 'Embroidery', 'Special Cloth']
  },
  {
    id: 186,
    name: 'Mining',
    icon: 'MIN',
    maxLevel: 450,
    categories: ['Smelting', 'Prospecting']
  },
  {
    id: 182,
    name: 'Herbalism',
    icon: 'HRB',
    maxLevel: 450,
    categories: ['Gathering']
  },
  {
    id: 393,
    name: 'Skinning',
    icon: 'SKN',
    maxLevel: 450,
    categories: ['Gathering']
  },
  {
    id: 185,
    name: 'Cooking',
    icon: 'COOK',
    maxLevel: 450,
    categories: ['Buff Foods', 'Feasts', 'Special']
  }
];

