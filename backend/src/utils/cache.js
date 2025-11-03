// backend/src/utils/cache.js
import { redisGet, redisSet, redisDel, getRedisClient } from '../config/redisClient.js';
import logger from './logger.js';

/**
 * Cache utility functions for frequently accessed data
 */

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed value or null if not found
 */
export async function get(key) {
  try {
    const cached = await redisGet(key);
    if (!cached) return null;

    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (error) {
    logger.warn(`[Cache] Failed to get key ${key}:`, error.message);
    return null;
  }
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns {Promise<void>}
 */
export async function set(key, value, ttlSeconds = 300) {
  try {
    await redisSet(key, value, ttlSeconds);
  } catch (error) {
    logger.warn(`[Cache] Failed to set key ${key}:`, error.message);
  }
}

/**
 * Invalidate (delete) a cache key
 * @param {string} key - Cache key to delete
 * @returns {Promise<void>}
 */
export async function invalidate(key) {
  try {
    await redisDel(key);
    logger.debug(`[Cache] Invalidated key: ${key}`);
  } catch (error) {
    logger.warn(`[Cache] Failed to invalidate key ${key}:`, error.message);
  }
}

/**
 * Invalidate multiple cache keys matching a pattern
 * @param {string[]} keys - Array of cache keys to delete
 * @returns {Promise<void>}
 */
export async function invalidateMultiple(keys) {
  try {
    await Promise.all(keys.map(key => invalidate(key)));
    logger.debug(`[Cache] Invalidated ${keys.length} keys`);
  } catch (error) {
    logger.warn(`[Cache] Failed to invalidate multiple keys:`, error.message);
  }
}

/**
 * Invalidate cache keys matching a pattern using SCAN
 * @param {string} pattern - Redis match pattern (e.g. cache:/api/properties*user:123)
 * @returns {Promise<void>}
 */
export async function invalidatePattern(pattern) {
  try {
    const client = getRedisClient();
    if (!client?.isOpen) {
      return;
    }

    const keysToDelete = [];
    for await (const key of client.scanIterator({ MATCH: pattern })) {
      keysToDelete.push(key);
    }

    if (keysToDelete.length === 0) {
      return;
    }

    await client.del(keysToDelete);
    logger.debug(`[Cache] Invalidated ${keysToDelete.length} keys for pattern ${pattern}`);
  } catch (error) {
    logger.warn(`[Cache] Failed to invalidate pattern ${pattern}:`, error.message);
  }
}

/**
 * Middleware to cache GET requests
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds
 * @param {Function} options.keyGenerator - Function to generate cache key from req
 * @returns {Function} Express middleware
 */
export function cacheMiddleware({ ttl = 300, keyGenerator = null } = {}) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.originalUrl || req.url}:user:${req.user?.id || 'anonymous'}`;

    try {
      // Try to get from cache
      const cached = await get(cacheKey);
      if (cached) {
        logger.debug(`[Cache] HIT: ${cacheKey}`);
        return res.json(cached);
      }

      logger.debug(`[Cache] MISS: ${cacheKey}`);

      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          set(cacheKey, data, ttl).catch(error => {
            logger.warn(`[Cache] Failed to cache response for ${cacheKey}:`, error.message);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.warn(`[Cache] Middleware error for ${cacheKey}:`, error.message);
      next();
    }
  };
}

export default {
  get,
  set,
  invalidate,
  invalidateMultiple,
  invalidatePattern,
  cacheMiddleware,
};
