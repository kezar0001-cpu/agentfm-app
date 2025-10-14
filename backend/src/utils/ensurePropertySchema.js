// backend/src/utils/ensurePropertySchema.js
// Ensures the legacy Property table has all columns expected by the modern application.

export const PROPERTY_SCHEMA_STATEMENTS = [
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "address" TEXT',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "postcode" TEXT',
  "ALTER TABLE \"Property\" ADD COLUMN IF NOT EXISTS \"status\" TEXT DEFAULT 'Active'",
  "UPDATE \"Property\" SET \"status\" = 'Active' WHERE \"status\" IS NULL",
  "ALTER TABLE \"Property\" ALTER COLUMN \"status\" SET DEFAULT 'Active'",
  'ALTER TABLE "Property" ALTER COLUMN "status" SET NOT NULL',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[]',
  'ALTER TABLE "Property" ALTER COLUMN "images" SET DEFAULT ARRAY[]::TEXT[]',
  'ALTER TABLE "Property" ALTER COLUMN "images" SET NOT NULL',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
];

export async function ensurePropertySchema(prisma) {
  for (const statement of PROPERTY_SCHEMA_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }
}
