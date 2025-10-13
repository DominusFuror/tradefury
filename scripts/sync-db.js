const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '..', 'db');
const TARGET_DIR = path.resolve(__dirname, '..', 'public', 'db');

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const copyCsvFiles = () => {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn('[sync-db] Source directory "db" was not found. Skipping CSV sync.');
    return;
  }

  ensureDirectory(TARGET_DIR);

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((fileName) => path.extname(fileName).toLowerCase() === '.csv');

  let copiedCount = 0;
  for (const fileName of files) {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const targetPath = path.join(TARGET_DIR, fileName);

    const sourceStats = fs.statSync(sourcePath);
    const targetExists = fs.existsSync(targetPath);
    const targetStats = targetExists ? fs.statSync(targetPath) : null;
    const shouldCopy =
      !targetExists ||
      sourceStats.mtimeMs > targetStats.mtimeMs ||
      sourceStats.size !== targetStats.size;

    if (shouldCopy) {
      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
    }
  }

  console.log(`[sync-db] ${copiedCount} file(s) updated. ${files.length} CSV file(s) available in public/db.`);
};

copyCsvFiles();
