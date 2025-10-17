// backend/src/utils/ensureUserSchema.js
import prisma from '../config/prismaClient.js';

const USER_SCHEMA_ALTER_STATEMENTS = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE_TRIAL'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL'`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company" TEXT`,
];

const USER_SCHEMA_POST_ALTER_UPDATES = [
  `UPDATE "User"
    SET "firstName" = COALESCE(NULLIF("firstName", ''), NULLIF(split_part("name", ' ', 1), ''))
    WHERE "name" IS NOT NULL AND COALESCE(NULLIF("firstName", ''), NULL) IS NULL`,
  `UPDATE "User"
    SET "lastName" = COALESCE(
      NULLIF("lastName", ''),
      NULLIF(
        BTRIM(
          CASE
            WHEN position(' ' IN "name") > 0 THEN substring("name" FROM position(' ' IN "name") + 1)
            ELSE ''
          END
        ),
        ''
      ),
      'User'
    )
    WHERE "name" IS NOT NULL AND COALESCE(NULLIF("lastName", ''), NULL) IS NULL`,
  `UPDATE "User"
    SET "subscriptionStatus" = 'TRIAL'
    WHERE COALESCE(NULLIF("subscriptionStatus", ''), NULL) IS NULL`,
  `UPDATE "User"
    SET "subscriptionPlan" = 'FREE_TRIAL'
    WHERE COALESCE(NULLIF("subscriptionPlan", ''), NULL) IS NULL`,
  `UPDATE "User"
    SET "role" = UPPER("role")
    WHERE "role" IS NOT NULL AND "role" <> UPPER("role")`,
];

const USER_SCHEMA_DROP_DEFAULTS = [
  'ALTER TABLE "User" ALTER COLUMN "firstName" DROP DEFAULT',
  'ALTER TABLE "User" ALTER COLUMN "lastName" DROP DEFAULT',
  'ALTER TABLE "User" ALTER COLUMN "subscriptionPlan" DROP DEFAULT',
  'ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" DROP DEFAULT',
];

function getExec(client) {
  if (client && typeof client.$executeRawUnsafe === 'function') {
    return (sql) => client.$executeRawUnsafe(sql);
  }
  throw new Error('Prisma client must provide $executeRawUnsafe');
}

export async function ensureUserSchema(client = prisma) {
  const execRaw = getExec(client);

  for (const sql of USER_SCHEMA_ALTER_STATEMENTS) {
    try {
      await execRaw(sql);
    } catch (error) {
      console.warn('[ensureUserSchema] alter failed', { sql, message: error?.message, code: error?.code });
    }
  }

  for (const sql of USER_SCHEMA_POST_ALTER_UPDATES) {
    try {
      await execRaw(sql);
    } catch (error) {
      console.warn('[ensureUserSchema] update failed', { sql, message: error?.message, code: error?.code });
    }
  }

  for (const sql of USER_SCHEMA_DROP_DEFAULTS) {
    try {
      await execRaw(sql);
    } catch (error) {
      if (error?.code !== '42704') {
        console.warn('[ensureUserSchema] drop default failed', { sql, message: error?.message, code: error?.code });
      }
    }
  }
}

export default ensureUserSchema;
