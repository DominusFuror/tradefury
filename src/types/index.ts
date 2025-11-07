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
  maxSkillLevel?: number | null;
  trivialSkillLow?: number | null;
  trivialSkillHigh?: number | null;
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
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_alchemy.jpg',
    maxLevel: 450,
    categories: ['Transmute', 'Elixirs', 'Flasks', 'Potions']
  },
  {
    id: 164,
    name: 'Blacksmithing',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_blacksmithing.jpg',
    maxLevel: 450,
    categories: ['Armor', 'Weapons', 'Enhancements', 'Shields']
  },
  {
    id: 333,
    name: 'Enchanting',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_engraving.jpg',
    maxLevel: 450,
    categories: ['Weapon Enchants', 'Armor Enchants', 'Scrolls', 'Wands']
  },
  {
    id: 202,
    name: 'Engineering',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_engineering.jpg',
    maxLevel: 450,
    categories: ['Gadgets', 'Bombs', 'Scopes', 'Armor']
  },
  {
    id: 773,
    name: 'Inscription',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_inscription_tradeskill01.jpg',
    maxLevel: 450,
    categories: ['Glyphs', 'Scrolls', 'Darkmoon Cards', 'Off-hand']
  },
  {
    id: 755,
    name: 'Jewelcrafting',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_gem_01.jpg',
    maxLevel: 450,
    categories: ['Gem Cuts', 'Meta Gems', 'Figurines', 'Prismatic']
  },
  {
    id: 165,
    name: 'Leatherworking',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_armorkit_17.jpg',
    maxLevel: 450,
    categories: ['Leather Armor', 'Mail Armor', 'Drums', 'Armorkits']
  },
  {
    id: 197,
    name: 'Tailoring',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_tailoring.jpg',
    maxLevel: 450,
    categories: ['Cloth Armor', 'Bags', 'Embroidery', 'Special Cloth']
  },
  {
    id: 186,
    name: 'Mining',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_mining.jpg',
    maxLevel: 450,
    categories: ['Smelting', 'Prospecting']
  },
  {
    id: 182,
    name: 'Herbalism',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/trade_herbalism.jpg',
    maxLevel: 450,
    categories: ['Gathering']
  },
  {
    id: 393,
    name: 'Skinning',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_pelt_wolf_01.jpg',
    maxLevel: 450,
    categories: ['Gathering']
  },
  {
    id: 185,
    name: 'Cooking',
    icon: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_food_15.jpg',
    maxLevel: 450,
    categories: ['Buff Foods', 'Feasts', 'Special']
  }
];

