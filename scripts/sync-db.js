const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '..', 'db');
const TARGET_DIR = path.resolve(__dirname, '..', 'public', 'db');

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const walkAndCopyCsv = (relativeDir = '') => {
  const sourceDir = path.join(SOURCE_DIR, relativeDir);
  if (!fs.existsSync(sourceDir)) {
    return { copied: 0, total: 0 };
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  let copied = 0;
  let total = 0;

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);
    const sourcePath = path.join(SOURCE_DIR, entryRelativePath);
    const targetPath = path.join(TARGET_DIR, entryRelativePath);

    if (entry.isDirectory()) {
      ensureDirectory(targetPath);
      const result = walkAndCopyCsv(entryRelativePath);
      copied += result.copied;
      total += result.total;
      continue;
    }

    if (path.extname(entry.name).toLowerCase() !== '.csv') {
      continue;
    }

    total += 1;

    const targetDir = path.dirname(targetPath);
    ensureDirectory(targetDir);

    const sourceStats = fs.statSync(sourcePath);
    const targetExists = fs.existsSync(targetPath);
    const targetStats = targetExists ? fs.statSync(targetPath) : null;
    const shouldCopy =
      !targetExists ||
      sourceStats.mtimeMs > (targetStats?.mtimeMs ?? 0) ||
      sourceStats.size !== (targetStats?.size ?? -1);

    if (shouldCopy) {
      fs.copyFileSync(sourcePath, targetPath);
      copied += 1;
    }
  }

  return { copied, total };
};

const copyCsvFiles = () => {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn('[sync-db] Source directory "db" was not found. Skipping CSV sync.');
    return;
  }

  ensureDirectory(TARGET_DIR);
  const { copied, total } = walkAndCopyCsv();
  console.log(`[sync-db] ${copied} file(s) updated. ${total} CSV file(s) available in public/db.`);
};

copyCsvFiles();
