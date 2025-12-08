const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const PORT = Number(process.env.PORT) || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const STORAGE_KEYS = {
  'auctionator-data': 'auctionator-data.json',
  'item-name-cache': 'item-name-cache.json',
  'server-info': 'server-info.json',
  'user-preferences': 'user-preferences.json'
};

const ensureDataDir = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
};

const getStoragePath = (key) => {
  const fileName = STORAGE_KEYS[key];
  if (!fileName) {
    return null;
  }

  return path.join(DATA_DIR, fileName);
};

const readJsonFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content) {
      return null;
    }
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    console.error(`[storage] Failed to read ${filePath}`, error);
    throw error;
  }
};

const writeJsonFile = async (filePath, payload) => {
  const serialized = JSON.stringify(payload, null, 2);
  await fs.writeFile(filePath, serialized, 'utf8');
};

const deleteJsonFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[storage] Failed to delete ${filePath}`, error);
      throw error;
    }
  }
};

const createApp = () => {
  const app = express();
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*'
    })
  );
  app.use(express.json({ limit: process.env.BODY_LIMIT || '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/storage/:key', async (req, res) => {
    const { key } = req.params;
    const storagePath = getStoragePath(key);
    if (!storagePath) {
      res.status(404).json({ error: 'Unknown storage key' });
      return;
    }

    try {
      const payload = await readJsonFile(storagePath);

      // Set Cache-Control headers based on key type
      if (key === 'auctionator-data') {
        // Cache with mandatory revalidation - faster 304 responses
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else if (key === 'item-name-cache') {
        // Cache for 7 days with revalidation at end
        res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
      } else {
        // Cache for 2 days with revalidation (server-info, user-preferences, etc)
        res.setHeader('Cache-Control', 'public, max-age=172800, must-revalidate');
      }

      if (payload === null) {
        res.status(204).send();
        return;
      }

      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read storage payload' });
    }
  });

  app.put('/api/storage/:key', async (req, res) => {
    const { key } = req.params;
    const storagePath = getStoragePath(key);
    if (!storagePath) {
      res.status(404).json({ error: 'Unknown storage key' });
      return;
    }

    const payload = req.body;
    if (payload === undefined) {
      res.status(400).json({ error: 'Request body is required' });
      return;
    }

    try {
      await ensureDataDir();
      await writeJsonFile(storagePath, payload);

      // Логирование загрузки auctionator-data
      if (key === 'auctionator-data') {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const fileSize = JSON.stringify(payload).length;
        const timestamp = new Date().toISOString();

        // Подсчитываем количество записей
        let recordCount = 0;
        if (payload && payload.itemPrices) {
          recordCount = Object.keys(payload.itemPrices).length;
        }

        const logEntry = `[${timestamp}] IP: ${clientIP} | File: ${key} | Size: ${fileSize} bytes | Records: ${recordCount} | Source: ${payload.source || 'unknown'}\n`;
        const logPath = path.join(DATA_DIR, 'uploads.log');

        await fs.appendFile(logPath, logEntry, 'utf8');
        console.log(`[upload] ${logEntry.trim()}`);
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to persist storage payload' });
    }
  });

  app.delete('/api/storage/:key', async (req, res) => {
    const { key } = req.params;
    const storagePath = getStoragePath(key);
    if (!storagePath) {
      res.status(404).json({ error: 'Unknown storage key' });
      return;
    }

    try {
      await deleteJsonFile(storagePath);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete storage payload' });
    }
  });

  // --- Serve Static Files (Production) ---
  const buildPath = path.join(__dirname, '..', 'build');
  const dbPath = path.join(__dirname, '..', 'public', 'db');

  // Serve CSV database files with 2-day cache
  app.use('/db', express.static(dbPath, {
    maxAge: 172800000, // 2 days in milliseconds
    etag: true,
    lastModified: true,
    immutable: false,
    setHeaders: (res, path) => {
      // Cache for 2 days without revalidation - instant load from disk cache
      res.setHeader('Cache-Control', 'public, max-age=172800');
    }
  }));

  // Serve static files from React build
  app.use(express.static(buildPath, {
    maxAge: 86400000, // 1 day in milliseconds
    etag: true,
    lastModified: true
  }));

  // Catch-all handler для React Router
  // Любой запрос, не попавший в API, возвращает index.html
  app.get('*', (req, res) => {
    // Игнорируем запросы к API, которые не были обработаны (404)
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  return app;
};

const start = async () => {
  await ensureDataDir();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[storage] Server listening on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error('[storage] Failed to start server', error);
  process.exit(1);
});
