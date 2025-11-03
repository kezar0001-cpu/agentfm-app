// backend/src/config/redisClient.js
import { createClient } from 'redis';

const DEFAULT_REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.REDIS_HOST;

function createNoopClient() {
  return {
    isOpen: false,
    async connect() {},
    async get() { return null; },
    async set() {},
    async setEx() {},
    async del() {},
    async *scanIterator() {},
  };
}

let redisClient = null;
let connectAttempted = false;

function initialiseRedis() {
  if (redisClient) {
    return redisClient;
  }

  if (process.env.REDIS_DISABLED === 'true') {
    redisClient = createNoopClient();
    return redisClient;
  }

  const url = DEFAULT_REDIS_URL ? DEFAULT_REDIS_URL : undefined;

  try {
    redisClient = createClient(
      url
        ? {
            url,
            socket: {
              reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
            },
          }
        : {
            socket: {
              host: process.env.REDIS_HOST || '127.0.0.1',
              port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
              reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
            },
          }
    );

    redisClient.on('error', (error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Redis] Connection error:', error.message);
      }
    });

    redisClient.on('ready', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[Redis] Connected');
      }
    });
  } catch (error) {
    console.error('[Redis] Failed to initialise client:', error.message);
    redisClient = createNoopClient();
  }

  return redisClient;
}

function ensureConnected() {
  const client = initialiseRedis();
  if (client.isOpen || connectAttempted) {
    return client;
  }

  connectAttempted = true;
  client
    .connect()
    .catch((error) => {
      console.error('[Redis] Connection failed:', error.message);
    })
    .finally(() => {
      connectAttempted = false;
    });

  return client;
}

export function getRedisClient() {
  return ensureConnected();
}

export async function redisGet(key) {
  const client = ensureConnected();
  if (!client?.isOpen) return null;
  try {
    return await client.get(key);
  } catch (error) {
    console.warn('[Redis] Failed to get key', key, error.message);
    return null;
  }
}

export async function redisSet(key, value, ttlSeconds = 300) {
  const client = ensureConnected();
  if (!client?.isOpen) return;
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await client.set(key, payload, {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.warn('[Redis] Failed to set key', key, error.message);
  }
}

export async function redisDel(key) {
  const client = ensureConnected();
  if (!client?.isOpen) return;
  try {
    await client.del(key);
  } catch (error) {
    console.warn('[Redis] Failed to delete key', key, error.message);
  }
}

export default {
  get: redisGet,
  set: redisSet,
  del: redisDel,
};
