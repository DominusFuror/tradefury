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
