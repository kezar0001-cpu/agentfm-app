import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePropertySchema, PROPERTY_SCHEMA_STATEMENTS } from '../src/utils/ensurePropertySchema.js';

describe('ensurePropertySchema', () => {
  it('executes the expected SQL statements in order', async () => {
    const calls = [];
    const prismaMock = {
      $executeRawUnsafe: async (sql) => {
        calls.push(sql);
      },
    };

    await ensurePropertySchema(prismaMock);

    assert.deepStrictEqual(calls, PROPERTY_SCHEMA_STATEMENTS);
  });
});
