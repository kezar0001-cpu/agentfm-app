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
      $queryRaw: async () => [],
    };

    await ensurePropertySchema(prismaMock);

    assert.deepStrictEqual(
      calls.slice(0, PROPERTY_SCHEMA_STATEMENTS.length),
      PROPERTY_SCHEMA_STATEMENTS,
    );

    assert.deepStrictEqual(calls.slice(PROPERTY_SCHEMA_STATEMENTS.length), [
      'ALTER TABLE "Property" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
    ]);
  });
});
