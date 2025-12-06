const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const storageEndpoint = (key: string): string => `${API_BASE_URL}/storage/${key}`;

const parseJsonResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('[SharedStorageClient] Failed to parse JSON response', error);
    throw new Error('Invalid JSON payload received from shared storage');
  }
};

export const SharedStorageClient = {
  async readJson<T = unknown>(key: string): Promise<T | null> {
    const endpoint = storageEndpoint(key);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'default' // Use browser's HTTP cache
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Unexpected status code ${response.status}`);
      }

      if (response.status === 404) {
        return null;
      }

      return (await parseJsonResponse(response)) as T | null;
    } catch (error) {
      console.error(`[SharedStorageClient] Failed to load ${key} data`, error);
      throw error;
    }
  },

  async writeJson(key: string, payload: unknown): Promise<void> {
    const endpoint = storageEndpoint(key);
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Unexpected status code ${response.status}`);
      }
    } catch (error) {
      console.error(`[SharedStorageClient] Failed to persist ${key} data`, error);
      throw error;
    }
  },

  async deleteKey(key: string): Promise<void> {
    const endpoint = storageEndpoint(key);
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Unexpected status code ${response.status}`);
      }
    } catch (error) {
      console.error(`[SharedStorageClient] Failed to clear ${key} data`, error);
      throw error;
    }
  },

  async getAuctionatorData(): Promise<unknown | null> {
    return this.readJson('auctionator-data');
  },

  async saveAuctionatorData(payload: unknown): Promise<void> {
    await this.writeJson('auctionator-data', payload);
  },

  async clearAuctionatorData(): Promise<void> {
    await this.deleteKey('auctionator-data');
  }
};
