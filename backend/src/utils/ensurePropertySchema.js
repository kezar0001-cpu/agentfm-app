// backend/src/utils/ensurePropertySchema.js
import prisma from '../config/prismaClient.js';

// IMPORTANT: Postgres + Prisma default to quoted mixed-case table names like "Property".
// We use IF NOT EXISTS to avoid errors on repeat runs.

export async function ensurePropertySchema() {
  // Create images column (text[]) if missing; ensure default empty array
  // Also ensure status default is 'Active' (optional safety)
  const statements = [
    `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "images" text[] NOT NULL DEFAULT '{}'::text[];`,
    `ALTER TABLE "Property" ALTER COLUMN "status" SET DEFAULT 'Active';`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      // Log and continue; we don't want startup to crash if a statement is redundant on this DB
      console.warn('[ensurePropertySchema] statement failed:', { sql, message: e?.message, code: e?.code });
    }
  }

  // Optional: verify the shape we rely on
  try {
    const check = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Property'
        AND column_name IN ('images','status');
    `);
    console.log('[ensurePropertySchema] verified columns:', check);
  } catch (e) {
    console.warn('[ensurePropertySchema] verification failed:', e?.message);
  }
}
