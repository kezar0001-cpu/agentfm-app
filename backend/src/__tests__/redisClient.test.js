import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const TEST_REDIS_URL = 'redis://localhost:6379';

function createAsyncDelay() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('redisClient connection handling', () => {
  let redisModule;

  beforeEach(async () => {
    process.env.REDIS_URL = TEST_REDIS_URL;
    delete process.env.REDIS_DISABLED;
    redisModule = await import(`../config/redisClient.js?test=${Date.now()}`);
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    redisModule.__resetRedisClientForTests();
  });

  it('waits for the client to open before executing commands', async () => {
    const fakeClient = {
      isOpen: false,
      connectCalls: 0,
      setCalls: 0,
      wasOpenWhenSetCalled: null,
      on() {
        return this;
      },
      async connect() {
        this.connectCalls += 1;
        await createAsyncDelay();
        this.isOpen = true;
      },
      async set() {
        this.setCalls += 1;
        this.wasOpenWhenSetCalled = this.isOpen;
      },
      async get() {
        return 'value';
      },
      async del() {},
      async *scanIterator() {},
      async keys() {
        return [];
      },
    };

    redisModule.__setRedisClientFactoryForTests(() => fakeClient);

    await redisModule.redisSet('example', 'cached-value', 120);

    assert.equal(fakeClient.connectCalls, 1);
    assert.equal(fakeClient.setCalls, 1);
    assert.equal(fakeClient.wasOpenWhenSetCalled, true);
  });

  it('falls back to the noop client when connection fails', async () => {
    const fakeClient = {
      isOpen: false,
      connectCalls: 0,
      setCalls: 0,
      on() {
        return this;
      },
      async connect() {
        this.connectCalls += 1;
        await createAsyncDelay();
        throw new Error('connection failed');
      },
      async set() {
        this.setCalls += 1;
      },
      async get() {
        return 'value';
      },
      async del() {},
    };

    redisModule.__setRedisClientFactoryForTests(() => fakeClient);

    await redisModule.redisSet('example', 'value', 60);
    const result = await redisModule.redisGet('example');

    assert.equal(fakeClient.connectCalls, 1);
    assert.equal(fakeClient.setCalls, 0);
    assert.equal(result, null);
  });
});
