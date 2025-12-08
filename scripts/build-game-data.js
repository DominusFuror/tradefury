#!/usr/bin/env node

/**
 * Build script to parse CSV files into pre-optimized JSON
 * This eliminates the 5-second UI freeze from runtime CSV parsing
 * 
 * Usage: node scripts/build-game-data.js
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const PUBLIC_DB_DIR = path.resolve(__dirname, '..', 'public', 'db');
const OUTPUT_FILE = path.join(PUBLIC_DB_DIR, 'game-data.json');

// CSV file names (matching GameDataRepository.ts)
const CRAFTING_DB_FILE = 'craftingdb.csv';
const CRAFTING_WITH_SKILL_FILE = 'crafting_with_skill.csv';
const SKILL_LINE_FILE = 'SkillLineAbility.csv';
const ITEM_FILE = 'Item.csv';
const ITEM_DISPLAY_INFO_FILE = 'ItemDisplayInfo.csv';

const CREATE_ITEM_EFFECT_ID = '24';
const ENCHANT_SCROLL_EFFECT_ID = '53';

const SKILL_NAME_TO_PROFESSION_ID = {
    Alchemy: 171,
    Blacksmithing: 164,
    Cooking: 185,
    Enchanting: 333,
    Engineering: 202,
    'First Aid': 129,
    Inscription: 773,
    Jewelcrafting: 755,
    Leatherworking: 165,
    Mining: 186,
    Tailoring: 197
};

const REAGENT_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8];
const EFFECT_INDEXES = [1, 2, 3];

// Helper functions (matching GameDataRepository.ts logic)
const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const parseString = (value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

const parseCsvSync = (fileName) => {
    const filePath = path.join(PUBLIC_DB_DIR, fileName);
    console.log(`  Parsing ${fileName}...`);

    if (!fs.existsSync(filePath)) {
        console.warn(`  WARNING: ${fileName} not found, skipping`);
        return { data: [] };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true
    });

    console.log(`  ✓ Parsed ${result.data.length} rows from ${fileName}`);
    return result;
};

const extractCreateItemEffect = (row) => {
    for (const index of EFFECT_INDEXES) {
        const effect = row[`Effect_${index}`];
        const itemId = parseNumber(row[`EffectItemType_${index}`]);

        if (effect === CREATE_ITEM_EFFECT_ID) {
            if (itemId === null || itemId <= 0) continue;
            const basePoints = parseNumber(row[`EffectBasePoints_${index}`]) ?? 0;
            return { itemId, quantity: basePoints + 1 };
        }

        if (effect === ENCHANT_SCROLL_EFFECT_ID) {
            if (itemId === null || itemId <= 0) continue;
            return { itemId, quantity: 1 };
        }
    }
    return null;
};

const extractReagents = (row) => {
    const reagents = [];
    for (const index of REAGENT_INDEXES) {
        const reagentId = parseNumber(row[`Reagent_${index}`]);
        const reagentCount = parseNumber(row[`ReagentCount_${index}`]) ?? 0;

        if (reagentId !== null && reagentId > 0 && reagentCount > 0) {
            reagents.push({ itemId: reagentId, quantity: reagentCount });
        }
    }
    return reagents;
};

const resolveSpellName = (row) => {
    const russianName = parseString(row.Name_Lang_ruRU);
    const englishName = parseString(row.Name_Lang_enUS);
    return russianName ?? englishName ?? `Spell #${row.ID}`;
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
];

const extractItemName = (row) => {
    for (const key of ITEM_NAME_KEYS) {
        const parsed = parseString(row[key]);
        if (parsed) return parsed;
    }
    return null;
};

console.log('🔨 Building pre-parsed game data...\n');

// Step 1: Parse crafting_with_skill.csv
console.log('Step 1: Processing profession/skill mapping');
const skillRows = parseCsvSync(CRAFTING_WITH_SKILL_FILE);
const spellToProfession = new Map();
const professionSpellIds = new Map();

for (const row of skillRows.data) {
    const spellId = parseNumber(row.SpellID);
    const professionId = SKILL_NAME_TO_PROFESSION_ID[row.SkillName?.trim()];
    const minSkillValue = parseNumber(row.RequiredSkill) ?? 0;

    if (spellId === null || !professionId) continue;

    if (!professionSpellIds.has(professionId)) {
        professionSpellIds.set(professionId, new Set());
    }
    professionSpellIds.get(professionId).add(spellId);

    if (!spellToProfession.has(spellId)) {
        spellToProfession.set(spellId, {
            professionId,
            minSkill: minSkillValue,
            maxSkill: null,
            trivialSkillLow: null,
            trivialSkillHigh: null
        });
    }
}

console.log(`  ✓ Mapped ${spellToProfession.size} spells to professions\n`);

// Step 2: Parse SkillLineAbility.csv
console.log('Step 2: Processing skill line abilities');
const skillLineRows = parseCsvSync(SKILL_LINE_FILE);

for (const row of skillLineRows.data) {
    const professionId = parseNumber(row.SkillLine);
    const spellId = parseNumber(row.Spell);
    if (professionId === null || spellId === null) continue;

    const minSkill = parseNumber(row.MinSkillLineRank);
    const maxSkill = parseNumber(row.MaxSkillLineRank);
    const trivialHigh = parseNumber(row.TrivialSkillLineRankHigh);
    const trivialLow = parseNumber(row.TrivialSkillLineRankLow);

    if (!professionSpellIds.has(professionId)) {
        professionSpellIds.set(professionId, new Set());
    }
    professionSpellIds.get(professionId).add(spellId);

    const existingMeta = spellToProfession.get(spellId);
    if (!existingMeta) {
        spellToProfession.set(spellId, {
            professionId,
            minSkill: minSkill ?? 0,
            maxSkill: maxSkill ?? null,
            trivialSkillLow: trivialLow ?? null,
            trivialSkillHigh: trivialHigh ?? null
        });
    } else if (existingMeta.professionId === professionId) {
        if (minSkill !== null && minSkill > 0 && (existingMeta.minSkill <= 0 || minSkill < existingMeta.minSkill)) {
            existingMeta.minSkill = minSkill;
        }
        if (maxSkill !== null) {
            existingMeta.maxSkill = existingMeta.maxSkill === null ? maxSkill : Math.max(existingMeta.maxSkill, maxSkill);
        }
        if (trivialLow !== null) {
            existingMeta.trivialSkillLow = existingMeta.trivialSkillLow === null ? trivialLow : Math.min(existingMeta.trivialSkillLow, trivialLow);
        }
        if (trivialHigh !== null) {
            existingMeta.trivialSkillHigh = existingMeta.trivialSkillHigh === null ? trivialHigh : Math.max(existingMeta.trivialSkillHigh, trivialHigh);
        }
    }
}

console.log(`  ✓ Updated skill line data\n`);

// Step 3: Parse craftingdb.csv
console.log('Step 3: Processing crafting recipes');
const craftingRows = parseCsvSync(CRAFTING_DB_FILE);
const relevantSpellIds = new Set(spellToProfession.keys());
const spells = [];
const itemIds = new Set();

for (const row of craftingRows.data) {
    const spellId = parseNumber(row.ID);
    if (spellId === null || !relevantSpellIds.has(spellId)) continue;

    const professionMeta = spellToProfession.get(spellId);
    if (!professionMeta) continue;

    const createEffect = extractCreateItemEffect(row);
    if (!createEffect) continue;

    const spell = {
        spellId,
        professionId: professionMeta.professionId,
        name: resolveSpellName(row),
        iconId: parseNumber(row.SpellIconID),
        minSkill: professionMeta.minSkill,
        maxSkill: professionMeta.maxSkill,
        trivialSkillLow: professionMeta.trivialSkillLow,
        trivialSkillHigh: professionMeta.trivialSkillHigh,
        resultItemId: createEffect.itemId,
        resultItemQuantity: createEffect.quantity,
        reagents: extractReagents(row)
    };

    spells.push(spell);
    itemIds.add(createEffect.itemId);
    spell.reagents.forEach(r => itemIds.add(r.itemId));
}

console.log(`  ✓ Processed ${spells.length} crafting recipes\n`);

// Item name override files
const ITEM_NAME_OVERRIDE_FILES = [
    'itemsidnames/items_new.csv',
    'itemsidnames/items_from_crafting.csv'
];

// Helper to parse overrides
const parseOverrides = () => {
    const overrides = new Map();

    for (const fileName of ITEM_NAME_OVERRIDE_FILES) {
        const filePath = path.join(PUBLIC_DB_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`  WARNING: Override file ${fileName} not found`);
            continue;
        }

        console.log(`  Parsing override file ${fileName}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            step: (results) => {
                const { id, name } = results.data;
                const parsedId = parseNumber(id);
                const parsedName = parseString(name);
                if (parsedId !== null && parsedName) {
                    overrides.set(parsedId, parsedName);
                }
            }
        });
    }
    return overrides;
};

// Step 4: Parse Item.csv and apply overrides
console.log('Step 4: Loading item data and overrides');
const overrides = parseOverrides();
console.log(`  ✓ Loaded ${overrides.size} name overrides`);

const itemRows = parseCsvSync(ITEM_FILE);
const items = [];

for (const row of itemRows.data) {
    const id = parseNumber(row.ID);
    if (id === null || !itemIds.has(id)) continue;

    let name = extractItemName(row);

    // Apply override if present
    if (overrides.has(id)) {
        name = overrides.get(id);
    }

    items.push({
        id,
        displayInfoId: parseNumber(row.DisplayInfoID),
        name
    });
}

console.log(`  ✓ Loaded ${items.length} items\n`);

// Step 5: Parse ItemDisplayInfo.csv
console.log('Step 5: Loading item display info');
const displayInfoIds = new Set();
items.forEach(item => {
    if (item.displayInfoId !== null) {
        displayInfoIds.add(item.displayInfoId);
    }
});

const displayInfoRows = parseCsvSync(ITEM_DISPLAY_INFO_FILE);
const itemDisplayInfo = [];

for (const row of displayInfoRows.data) {
    const id = parseNumber(row.ID);
    if (id === null || !displayInfoIds.has(id)) continue;

    itemDisplayInfo.push({
        id,
        iconName: parseString(row.InventoryIcon_1)
    });
}

console.log(`  ✓ Loaded ${itemDisplayInfo.length} display info records\n`);

// Step 6: Build final JSON structure
console.log('Step 6: Building final JSON structure');
const gameData = {
    version: '1.0.0',
    buildTime: new Date().toISOString(),
    professionSpellIds: {},
    spells,
    items,
    itemDisplayInfo
};

// Convert Map to object
professionSpellIds.forEach((spellIds, professionId) => {
    gameData.professionSpellIds[professionId] = Array.from(spellIds);
});

// Step 7: Write to file
console.log('Step 7: Writing game-data.json');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gameData, null, 2), 'utf8');

const fileSize = fs.statSync(OUTPUT_FILE).size;
const fileSizeKB = (fileSize / 1024).toFixed(2);

console.log(`\n✅ Successfully built game-data.json`);
console.log(`   Size: ${fileSizeKB} KB`);
console.log(`   Spells: ${spells.length}`);
console.log(`   Items: ${items.length}`);
console.log(`   Display Info: ${itemDisplayInfo.length}`);
console.log(`   File: ${OUTPUT_FILE}\n`);
