// backend/src/utils/ensurePropertySchema.js
// Ensures the legacy Property table has all columns expected by the modern application.

export const PROPERTY_SCHEMA_STATEMENTS = [
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "address" TEXT',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "postcode" TEXT',
  "ALTER TABLE \"Property\" ADD COLUMN IF NOT EXISTS \"status\" TEXT DEFAULT 'Active'",
  "UPDATE \"Property\" SET \"status\" = 'Active' WHERE \"status\" IS NULL",
  "ALTER TABLE \"Property\" ALTER COLUMN \"status\" SET DEFAULT 'Active'",
  'ALTER TABLE "Property" ALTER COLUMN "status" SET NOT NULL',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3)',
  'ALTER TABLE "Property" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP',
  'UPDATE "Property" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL',
  'ALTER TABLE "Property" ALTER COLUMN "createdAt" SET NOT NULL',
  'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
];

const ensureImagesColumn = async (prisma) => {
  const columnInfo = await prisma.$queryRaw`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Property'
      AND column_name = 'images'
    LIMIT 1;
  `;

  if (!Array.isArray(columnInfo) || columnInfo.length === 0) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Property" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
    );
    return;
  }

  const [{ data_type: dataType, udt_name: udtName }] = columnInfo;

  if (dataType === 'ARRAY' && udtName === '_text') {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Property" ALTER COLUMN "images" SET DEFAULT ARRAY[]::TEXT[]',
    );
    await prisma.$executeRawUnsafe(
      'UPDATE "Property" SET "images" = ARRAY[]::TEXT[] WHERE "images" IS NULL',
    );
    await prisma.$executeRawUnsafe('ALTER TABLE "Property" ALTER COLUMN "images" SET NOT NULL');
    return;
  }

  if (dataType === 'jsonb') {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE \"Property\" ALTER COLUMN \"images\" SET DEFAULT '[]'::jsonb",
    );
    await prisma.$executeRawUnsafe(
      "UPDATE \"Property\" SET \"images\" = '[]'::jsonb WHERE \"images\" IS NULL",
    );
    await prisma.$executeRawUnsafe('ALTER TABLE "Property" ALTER COLUMN "images" SET NOT NULL');
    return;
  }

  console.warn(
    `Property.images column has unsupported type ${dataType} (${udtName}); skipping default enforcement`,
  );
};

export async function ensurePropertySchema(prisma) {
  for (const statement of PROPERTY_SCHEMA_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }

  await ensureImagesColumn(prisma);
}
