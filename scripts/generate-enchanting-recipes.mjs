import fs from 'fs/promises';

const IDS_FILE = new URL('../infodata/enchantIDIS.txt', import.meta.url);
const OUTPUT_FILE = new URL('../src/data/enchanting-recipes.json', import.meta.url);
const DATA_ENV = 'wotlk';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';

const QUALITY_MAP = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const htmlDecode = (str) =>
  str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const ICON_BASE = 'https://wow.zamimg.com/images/wow/icons/large/';

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Failed request ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parseReagents(tooltipHtml) {
  const reagents = [];
  const regex = /<a href="\/(?:ru\/)?item=(\d+)[^"]*">([^<]+)<\/a>&nbsp;\((\d+)\)/g;
  let match;

  while ((match = regex.exec(tooltipHtml)) !== null) {
    reagents.push({
      id: Number(match[1]),
      name: htmlDecode(match[2]),
      quantity: Number(match[3])
    });
  }

  return reagents;
}

function parseStackSize(tooltipHtml) {
  const match = tooltipHtml.match(/Max Stack: (\d+)/);
  if (match) {
    return Number(match[1]);
  }

  const localizedMatch = tooltipHtml.match(/���ᨬ� � �⮯��: (\d+)/);
  if (localizedMatch) {
    return Number(localizedMatch[1]);
  }

  return 20;
}

function parseItemLevel(tooltipHtml) {
  const match = tooltipHtml.match(/Item Level <!--ilvl-->(\d+)/);
  if (match) {
    return Number(match[1]);
  }

  const localizedMatch = tooltipHtml.match(/�஢��� �।���: <!--ilvl-->(\d+)/);
  if (localizedMatch) {
    return Number(localizedMatch[1]);
  }

  return 0;
}

function parseSkillRequirement(tooltipHtml) {
  const match = tooltipHtml.match(/Enchanting \((\d+)\)/);
  if (match) {
    return Number(match[1]);
  }

  const ruMatch = tooltipHtml.match(/��������� �� \((\d+)\)/);
  if (ruMatch) {
    return Number(ruMatch[1]);
  }

  return 0;
}

function deriveCategory(tooltipHtml, englishName) {
  const requirementMatch = tooltipHtml.match(/Requires ([^<]+)</);
  if (requirementMatch) {
    const requirement = requirementMatch[1];
    if (requirement.includes('Weapon')) {
      return 'Оружие';
    }
    if (requirement.includes('Chest')) {
      return 'Грудь';
    }
    if (requirement.includes('Cloak')) {
      return 'Плащ';
    }
    if (requirement.includes('Boots')) {
      return 'Сапоги';
    }
    if (requirement.includes('Bracer')) {
      return 'Наручи';
    }
    if (requirement.includes('Gloves')) {
      return 'Перчатки';
    }
    if (requirement.includes('Shield')) {
      return 'Щит';
    }
    if (requirement.includes('Ring')) {
      return 'Кольца';
    }
  }

  if (/weapon/i.test(englishName)) {
    return 'Оружие';
  }

  if (/chest/i.test(englishName)) {
    return 'Грудь';
  }

  if (/cloak/i.test(englishName) || /cape/i.test(englishName)) {
    return 'Плащ';
  }

  if (/boots/i.test(englishName)) {
    return 'Сапоги';
  }

  if (/glove/i.test(englishName)) {
    return 'Перчатки';
  }

  if (/shield/i.test(englishName)) {
    return 'Щит';
  }

  if (/ring/i.test(englishName)) {
    return 'Кольца';
  }

  if (/bracer/i.test(englishName)) {
    return 'Наручи';
  }

  if (/staff/i.test(englishName)) {
    return 'Посохи';
  }

  return 'Зачарования';
}

const itemCache = new Map();

async function getItemData(id) {
  if (itemCache.has(id)) {
    return itemCache.get(id);
  }

  const json = await fetchJson(
    `https://nether.wowhead.com/tooltip/item/${id}?dataEnv=${DATA_ENV}&locale=ruRU`
  );

  const result = {
    id,
    name: htmlDecode(json.name),
    icon: `${ICON_BASE}${json.icon}.jpg`,
    quality: QUALITY_MAP[json.quality] || 'Common',
    itemLevel: parseItemLevel(json.tooltip),
    stackSize: parseStackSize(json.tooltip)
  };

  itemCache.set(id, result);
  return result;
}

async function buildRecipe(spellId) {
  const english = await fetchJson(
    `https://nether.wowhead.com/tooltip/spell/${spellId}?dataEnv=${DATA_ENV}`
  );

  await sleep(120);

  const russian = await fetchJson(
    `https://nether.wowhead.com/tooltip/spell/${spellId}?dataEnv=${DATA_ENV}&locale=ruRU`
  );

  const reagents = parseReagents(english.tooltip);
  const materials = [];

  for (const reagent of reagents) {
    const item = await getItemData(reagent.id);
    materials.push({
      id: reagent.id,
      name: item.name,
      icon: item.icon,
      quality: item.quality,
      itemLevel: item.itemLevel,
      stackSize: item.stackSize,
      quantity: reagent.quantity
    });
    await sleep(80);
  }

  const skillLevel = parseSkillRequirement(english.tooltip);
  const category = deriveCategory(english.tooltip, english.name);

  return {
    id: spellId,
    name: htmlDecode(russian.name || english.name),
    icon: `${ICON_BASE}${english.icon}.jpg`,
    skillLevel,
    category,
    result: {
      id: spellId,
      name: `Свиток: ${htmlDecode(russian.name || english.name)}`,
      icon: `${ICON_BASE}${english.icon}.jpg`,
      quality: 'Rare',
      itemLevel: 0,
      stackSize: 1
    },
    materials
  };
}

async function main() {
  const idsRaw = await fs.readFile(IDS_FILE, 'utf8');
  const spellIds = idsRaw
    .split(/[\s,]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => !Number.isNaN(value));

  const recipes = [];

  for (const [index, spellId] of spellIds.entries()) {
    console.log(`Processing ${spellId} (${index + 1}/${spellIds.length})`);
    try {
      const recipe = await buildRecipe(spellId);
      recipes.push(recipe);
    } catch (error) {
      console.error(`Failed to process spell ${spellId}:`, error.message);
    }
    await sleep(150);
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(recipes, null, 2), 'utf8');
  console.log(`Saved ${recipes.length} enchanting recipes to ${OUTPUT_FILE.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

