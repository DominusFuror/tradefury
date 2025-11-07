const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
};

const decodeEntity = (entity: string): string | null => {
  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const hex = entity.slice(2);
    const codePoint = Number.parseInt(hex, 16);
    if (Number.isFinite(codePoint)) {
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return null;
      }
    }
    return null;
  }

  if (entity.startsWith('#')) {
    const dec = entity.slice(1);
    const codePoint = Number.parseInt(dec, 10);
    if (Number.isFinite(codePoint)) {
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return null;
      }
    }
    return null;
  }

  return NAMED_ENTITIES[entity] ?? null;
};

export const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-fA-F]+|#\d+|\w+);/g, (match, entity) => decodeEntity(entity) ?? match);

