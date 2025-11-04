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
  };
}

let redisClient = null;
let connectAttempted = false;
let connectionFailed = false;

function initialiseRedis() {
  if (redisClient) {
    return redisClient;
  }

  if (process.env.REDIS_DISABLED === 'true') {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Redis] Disabled via REDIS_DISABLED environment variable');
    }
    redisClient = createNoopClient();
    return redisClient;
  }

  const url = DEFAULT_REDIS_URL ? DEFAULT_REDIS_URL : undefined;

  // If no Redis URL is configured, use noop client instead of trying localhost
  if (!url) {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Redis] No Redis URL configured, using noop client. Set REDIS_URL to enable Redis caching.');
    }
    redisClient = createNoopClient();
    return redisClient;
  }

  try {
    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          // Stop reconnecting after 5 attempts
          if (retries > 5) {
            console.error('[Redis] Max reconnection attempts reached, falling back to noop client');
            connectionFailed = true;
            return false; // Stop reconnecting
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    redisClient.on('error', (error) => {
      if (process.env.NODE_ENV !== 'test' && !connectionFailed) {
        console.error('[Redis] Connection error:', error.message);
      }
    });

    redisClient.on('ready', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[Redis] Connected');
      }
      connectionFailed = false;
    });
  } catch (error) {
    console.error('[Redis] Failed to initialise client:', error.message);
    redisClient = createNoopClient();
  }

  return redisClient;
}

function ensureConnected() {
  const client = initialiseRedis();

  // If it's a noop client or already connected, return it
  if (client.isOpen || connectAttempted || connectionFailed) {
    return client;
  }

  // If the client doesn't have a connect method (noop client), return it
  if (typeof client.connect !== 'function' || client === createNoopClient()) {
    return client;
  }

  connectAttempted = true;
  client
    .connect()
    .then(() => {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[Redis] Connection established successfully');
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Redis] Connection failed:', error.message);
        console.info('[Redis] Falling back to noop client (caching disabled)');
      }
      connectionFailed = true;
      // Replace with noop client on connection failure
      redisClient = createNoopClient();
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
