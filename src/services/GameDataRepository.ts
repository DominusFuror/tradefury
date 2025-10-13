import Papa from 'papaparse';

const CRAFTING_DB_FILE = 'craftingdb.csv';
const SKILL_LINE_FILE = 'SkillLineAbility.csv';
const ITEM_FILE = 'Item.csv';
const ITEM_DISPLAY_INFO_FILE = 'ItemDisplayInfo.csv';

const CREATE_ITEM_EFFECT_ID = '24';
const FALLBACK_ICON_URL =
  'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';

type PapaParseResult<T> = Papa.ParseResult<T>;

export interface ReagentEntry {
  itemId: number;
  quantity: number;
}

export interface SpellRecord {
  spellId: number;
  professionId: number;
  name: string;
  iconId: number | null;
  minSkill: number;
  resultItemId: number;
  resultItemQuantity: number;
  reagents: ReagentEntry[];
}

export interface ItemRecord {
  id: number;
  displayInfoId: number | null;
  name: string | null;
}

export interface ItemDisplayRecord {
  id: number;
  iconName: string | null;
}

interface SkillLineAbilityRow {
  SkillLine: string;
  Spell: string;
  MinSkillLineRank: string;
}

interface CraftingDbRow {
  ID: string;
  SpellIconID: string;
  Name_Lang_ruRU?: string;
  Name_Lang_enUS?: string;
  Reagent_1?: string;
  Reagent_2?: string;
  Reagent_3?: string;
  Reagent_4?: string;
  Reagent_5?: string;
  Reagent_6?: string;
  Reagent_7?: string;
  Reagent_8?: string;
  ReagentCount_1?: string;
  ReagentCount_2?: string;
  ReagentCount_3?: string;
  ReagentCount_4?: string;
  ReagentCount_5?: string;
  ReagentCount_6?: string;
  ReagentCount_7?: string;
  ReagentCount_8?: string;
  Effect_1?: string;
  Effect_2?: string;
  Effect_3?: string;
  EffectItemType_1?: string;
  EffectItemType_2?: string;
  EffectItemType_3?: string;
  EffectBasePoints_1?: string;
  EffectBasePoints_2?: string;
  EffectBasePoints_3?: string;
}

interface ItemRow {
  ID: string;
  DisplayInfoID?: string;
  [key: string]: string | undefined;
}

interface ItemDisplayRow {
  ID: string;
  InventoryIcon_1?: string;
}

const EFFECT_INDEXES: ReadonlyArray<1 | 2 | 3> = [1, 2, 3];
const REAGENT_INDEXES: ReadonlyArray<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [1, 2, 3, 4, 5, 6, 7, 8];

const parseNumber = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseString = (value?: string | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const createIconUrl = (iconName: string | null | undefined): string => {
  if (!iconName) {
    return FALLBACK_ICON_URL;
  }

  return `https://wow.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`;
};

const ITEM_NAME_KEYS = [
  'Name_lang_ruRU',
  'Name_Lang_ruRU',
  'Name_lang_enUS',
  'Name_Lang_enUS',
  'Name_lang_enGB',
  'Name_Lang_enGB',
  'Name_lang',
  'Name_Lang'
] as const;

const normalizePath = (pathValue: string): string => pathValue.replace(/\/{2,}/g, '/');

const buildRelativeDbPath = (fileName: string): string =>
  normalizePath(`${process.env.PUBLIC_URL || ''}/db/${fileName}`);

const getCsvUrl = (fileName: string): string => {
  if (typeof window !== 'undefined' && window.location) {
    return new URL(buildRelativeDbPath(fileName), window.location.origin).toString();
  }

  return buildRelativeDbPath(fileName);
};

const extractItemName = (row: ItemRow): string | null => {
  for (const key of ITEM_NAME_KEYS) {
    const rawValue = row[key];
    const parsed = parseString(rawValue);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const parseCsvFile = async <T>(fileName: string): Promise<PapaParseResult<T>> =>
  new Promise((resolve, reject) => {
    Papa.parse<T>(getCsvUrl(fileName), {
      download: true,
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => resolve(results),
      error: (error) => reject(error)
    });
  });

const parseCraftingDb = async (
  relevantSpellIds: Set<number>
): Promise<Map<number, CraftingDbRow>> =>
  new Promise((resolve, reject) => {
    const spells = new Map<number, CraftingDbRow>();

    Papa.parse<CraftingDbRow>(getCsvUrl(CRAFTING_DB_FILE), {
      download: true,
      header: true,
      skipEmptyLines: true,
      worker: true,
      step: (stepResult) => {
        const row = stepResult.data;
        const id = parseNumber(row.ID);
        if (id === null || !relevantSpellIds.has(id)) {
          return;
        }

        if (!spells.has(id)) {
          spells.set(id, row);
        }
      },
      complete: () => resolve(spells),
      error: (error) => reject(error)
    });
  });

const extractCreateItemEffect = (
  row: CraftingDbRow
): { itemId: number; quantity: number } | null => {
  for (const index of EFFECT_INDEXES) {
    const effect = row[`Effect_${index}` as keyof CraftingDbRow];
    if (effect !== CREATE_ITEM_EFFECT_ID) {
      continue;
    }

    const itemId = parseNumber(row[`EffectItemType_${index}` as keyof CraftingDbRow]);
    if (itemId === null || itemId <= 0) {
      continue;
    }

    const basePoints = parseNumber(row[`EffectBasePoints_${index}` as keyof CraftingDbRow]) ?? 0;
    return {
      itemId,
      quantity: basePoints + 1
    };
  }

  return null;
};

const extractReagents = (row: CraftingDbRow): ReagentEntry[] => {
  const reagents: ReagentEntry[] = [];

  for (const index of REAGENT_INDEXES) {
    const reagentId = parseNumber(row[`Reagent_${index}` as keyof CraftingDbRow]);
    const reagentCount = parseNumber(row[`ReagentCount_${index}` as keyof CraftingDbRow]) ?? 0;

    if (reagentId !== null && reagentId > 0 && reagentCount > 0) {
      reagents.push({
        itemId: reagentId,
        quantity: reagentCount
      });
    }
  }

  return reagents;
};

const resolveSpellName = (row: CraftingDbRow): string => {
  const russianName = parseString(row.Name_Lang_ruRU);
  const englishName = parseString(row.Name_Lang_enUS);

  return russianName ?? englishName ?? `Spell #${row.ID}`;
};

const normalizeSpellRecord = (
  row: CraftingDbRow,
  professionId: number,
  minSkill: number
): SpellRecord | null => {
  const spellId = parseNumber(row.ID);
  if (spellId === null) {
    return null;
  }

  const createEffect = extractCreateItemEffect(row);
  if (!createEffect) {
    return null;
  }

  return {
    spellId,
    professionId,
    name: resolveSpellName(row),
    iconId: parseNumber(row.SpellIconID),
    minSkill,
    resultItemId: createEffect.itemId,
    resultItemQuantity: createEffect.quantity,
    reagents: extractReagents(row)
  };
};

export class GameDataRepository {
  private static instance: GameDataRepository;

  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;

  private readonly spells = new Map<number, SpellRecord>();
  private readonly items = new Map<number, ItemRecord>();
  private readonly itemDisplayInfo = new Map<number, ItemDisplayRecord>();
  private readonly professionSpellIds = new Map<number, Set<number>>();

  private constructor() {}

  public static getInstance(): GameDataRepository {
    if (!GameDataRepository.instance) {
      GameDataRepository.instance = new GameDataRepository();
    }

    return GameDataRepository.instance;
  }

  public async load(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    if (!this.loadPromise) {
      this.loadPromise = this.performLoad();
    }

    await this.loadPromise;
  }

  private async performLoad(): Promise<void> {
    const skillLineResults = await parseCsvFile<SkillLineAbilityRow>(SKILL_LINE_FILE);

    const spellToProfession = new Map<number, { professionId: number; minSkill: number }>();
    const professionSpellIds = new Map<number, Set<number>>();

    for (const row of skillLineResults.data) {
      const professionId = parseNumber(row.SkillLine);
      const spellId = parseNumber(row.Spell);
      const minSkill = parseNumber(row.MinSkillLineRank) ?? 0;

      if (professionId === null || spellId === null) {
        continue;
      }

      if (!professionSpellIds.has(professionId)) {
        professionSpellIds.set(professionId, new Set());
      }

      professionSpellIds.get(professionId)?.add(spellId);
      spellToProfession.set(spellId, {
        professionId,
        minSkill
      });
    }

    this.professionSpellIds.clear();
    professionSpellIds.forEach((spellSet, professionId) => {
      this.professionSpellIds.set(professionId, spellSet);
    });

    const relevantSpellIds = new Set(spellToProfession.keys());
    const craftingRows = await parseCraftingDb(relevantSpellIds);

    const itemIds = new Set<number>();
    this.spells.clear();

    craftingRows.forEach((craftingRow, spellId) => {
      const professionMeta = spellToProfession.get(spellId);
      if (!professionMeta) {
        return;
      }

      const normalizedSpell = normalizeSpellRecord(
        craftingRow,
        professionMeta.professionId,
        professionMeta.minSkill
      );

      if (!normalizedSpell) {
        return;
      }

      itemIds.add(normalizedSpell.resultItemId);
      normalizedSpell.reagents.forEach((reagent) => itemIds.add(reagent.itemId));
      this.spells.set(spellId, normalizedSpell);
    });

    this.items.clear();
    if (itemIds.size > 0) {
      await this.loadItems(itemIds);
    }

    const displayInfoIds = new Set<number>();
    this.items.forEach((item) => {
      if (item.displayInfoId !== null) {
        displayInfoIds.add(item.displayInfoId);
      }
    });

    this.itemDisplayInfo.clear();
    if (displayInfoIds.size > 0) {
      await this.loadItemDisplayInfo(displayInfoIds);
    }

    this.isLoaded = true;
  }

  private async loadItems(itemIds: Set<number>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      Papa.parse<ItemRow>(getCsvUrl(ITEM_FILE), {
        download: true,
        header: true,
        skipEmptyLines: true,
        worker: true,
        step: (stepResult) => {
          const row = stepResult.data;
          const id = parseNumber(row.ID);
          if (id === null || !itemIds.has(id)) {
            return;
          }

          const displayInfoId = parseNumber(row.DisplayInfoID);
          const name = extractItemName(row);

          if (!this.items.has(id)) {
            this.items.set(id, {
              id,
              displayInfoId,
              name
            });
          } else {
            const existing = this.items.get(id);
            if (existing) {
              this.items.set(id, {
                ...existing,
                displayInfoId: existing.displayInfoId ?? displayInfoId ?? null,
                name: existing.name ?? name ?? null
              });
            }
          }
        },
        complete: () => resolve(),
        error: (error) => reject(error)
      });
    });
  }

  private async loadItemDisplayInfo(displayInfoIds: Set<number>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      Papa.parse<ItemDisplayRow>(getCsvUrl(ITEM_DISPLAY_INFO_FILE), {
        download: true,
        header: true,
        skipEmptyLines: true,
        worker: true,
        step: (stepResult) => {
          const row = stepResult.data;
          const id = parseNumber(row.ID);
          if (id === null || !displayInfoIds.has(id)) {
            return;
          }

          if (!this.itemDisplayInfo.has(id)) {
            this.itemDisplayInfo.set(id, {
              id,
              iconName: parseString(row.InventoryIcon_1)
            });
          }
        },
        complete: () => resolve(),
        error: (error) => reject(error)
      });
    });
  }

  public getAvailableProfessionIds(): number[] {
    return Array.from(this.professionSpellIds.keys());
  }

  public getRecipesByProfession(professionId: number): SpellRecord[] {
    const spellIds = this.professionSpellIds.get(professionId);
    if (!spellIds) {
      return [];
    }

    return Array.from(spellIds)
      .map((spellId) => this.spells.get(spellId))
      .filter((spellRecord): spellRecord is SpellRecord => Boolean(spellRecord));
  }

  public getItem(itemId: number): ItemRecord | undefined {
    return this.items.get(itemId);
  }

  public getItemName(itemId: number): string | undefined {
    return this.items.get(itemId)?.name ?? undefined;
  }

  public getItemIconUrl(itemId: number): string {
    const item = this.items.get(itemId);
    if (!item || item.displayInfoId === null) {
      return FALLBACK_ICON_URL;
    }

    const displayInfo = this.itemDisplayInfo.get(item.displayInfoId);
    return createIconUrl(displayInfo?.iconName);
  }
}

export const gameDataRepository = GameDataRepository.getInstance();
