// backend/src/utils/ensurePropertySchema.js
import prisma from '../config/prismaClient.js';

// IMPORTANT: Postgres + Prisma default to quoted mixed-case table names like "Property".
// We use IF NOT EXISTS to avoid errors on repeat runs.

export const PROPERTY_SCHEMA_STATEMENTS = [
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
  'ALTER TABLE "Property" ALTER COLUMN "state" DROP NOT NULL',
  'ALTER TABLE "Property" ALTER COLUMN "zipCode" DROP NOT NULL',
  "ALTER TABLE \"Property\" ALTER COLUMN \"status\" SET DEFAULT 'Active'",
];

const LEGACY_IMAGES_STATEMENT =
  'ALTER TABLE "Property" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]';

function getExec(client) {
  if (client && typeof client.$executeRawUnsafe === 'function') {
    return (sql) => client.$executeRawUnsafe(sql);
  }
  throw new Error('Prisma client must provide $executeRawUnsafe');
}

function getQuery(client) {
  if (client && typeof client.$queryRawUnsafe === 'function') {
    return (sql) => client.$queryRawUnsafe(sql);
  }
  if (client && typeof client.$queryRaw === 'function') {
    return (sql) => client.$queryRaw`${sql}`;
  }
  return null;
}

export async function ensurePropertySchema(client = prisma) {
  const execRaw = getExec(client);
  for (const sql of PROPERTY_SCHEMA_STATEMENTS) {
    try {
      await execRaw(sql);
    } catch (e) {
      console.warn('[ensurePropertySchema] statement failed:', { sql, message: e?.message, code: e?.code });
    }
  }

  try {
    await execRaw(LEGACY_IMAGES_STATEMENT);
  } catch (e) {
    if (e?.code !== '42701') {
      console.warn('[ensurePropertySchema] legacy statement failed:', { message: e?.message, code: e?.code });
    }
  }

  const query = getQuery(client);
  if (!query) return;

  try {
    await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Property'
        AND column_name IN ('images','status');
    `);
  } catch (e) {
    console.warn('[ensurePropertySchema] verification failed:', e?.message);
  }
}
