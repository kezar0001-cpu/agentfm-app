# Inspection Migration Fix

## Problem

The deployment was failing with the following errors:

**First deployment attempt:**
```
Database error code: 42703
ERROR: column "uploadedById" referenced in foreign key constraint does not exist
```

**Second deployment attempt (after fix):**
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251115000000_create_missing_inspection_tables` migration started at 2025-10-28 03:39:30.034604 UTC failed
```

## Root Cause

The migration `20251115000000_create_missing_inspection_tables` had a critical flaw:

1. It used `CREATE TABLE IF NOT EXISTS` to create the `InspectionAttachment` table
2. If the table already existed from a previous state (without the `uploadedById` column), the `CREATE TABLE IF NOT EXISTS` would skip table creation
3. The migration then tried to add a foreign key constraint for `uploadedById`
4. This failed because the column didn't exist in the pre-existing table

## Solution

The migration was updated to ensure columns exist before adding foreign key constraints:

### Changes to `20251115000000_create_missing_inspection_tables/migration.sql`

1. **Added column existence checks** after table creation:
   ```sql
   -- Ensure columns exist if table was created earlier without them
   ALTER TABLE "InspectionAttachment"
     ADD COLUMN IF NOT EXISTS "size" INTEGER,
     ADD COLUMN IF NOT EXISTS "annotations" JSONB,
     ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;
   ```

2. **Similar checks for other tables**:
   - `Inspection` table: Ensure `tags` column exists
   - `InspectionReminder` table: Ensure `recipients` and `metadata` columns exist
   - `InspectionAuditLog` table: Ensure `userId` is nullable

### Changes to `20251201000000_align_inspection_schema/migration.sql`

Made the migration more resilient by:
- Using proper column existence checks via `information_schema.columns`
- Wrapping all operations in a `DO $$ ... END $$` block for better error handling
- Making it truly idempotent (can run multiple times safely)

## Migration Order

1. **20251020013631_init** - Initial schema
2. **20251115000000_create_missing_inspection_tables** - Creates inspection tables (FIXED)
3. **20251201000000_align_inspection_schema** - Aligns schema (now redundant but kept for compatibility)

## Testing

The fix ensures:
- ✅ Tables can be created from scratch
- ✅ Existing tables can be updated with missing columns
- ✅ Foreign key constraints are only added after columns exist
- ✅ Migrations are idempotent (can run multiple times)
- ✅ No data loss occurs during migration

## Resolving Failed Migration State

Since the migration failed on the first attempt, Prisma marked it as failed in the `_prisma_migrations` table. Before the fixed migration can run, we need to resolve this state.

### Option 1: Using the SQL Script (Recommended for Production)

Run the provided SQL script against your database:

```bash
psql $DATABASE_URL -f backend/resolve-failed-migration.sql
```

Or connect to your database and run:

```sql
UPDATE "_prisma_migrations"
SET 
  rolled_back_at = NOW(),
  logs = COALESCE(logs, '') || E'\n\n--- MANUAL ROLLBACK ---\nMarked as rolled back to allow re-application with column existence fixes.'
WHERE migration_name = '20251115000000_create_missing_inspection_tables'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;
```

### Option 2: Using Prisma Migrate Resolve

```bash
npx prisma migrate resolve --rolled-back 20251115000000_create_missing_inspection_tables
```

### After Resolution

Once the failed migration is marked as rolled back, deploy again:

```bash
npx prisma migrate deploy
```

The migration will now:
1. Create tables if they don't exist
2. Add missing columns to existing tables
3. Add foreign key constraints only after columns exist
4. Create indexes for performance

## Prevention

To prevent similar issues in the future:
1. Always add columns before adding foreign key constraints
2. Use `ADD COLUMN IF NOT EXISTS` for existing tables
3. Test migrations against databases in various states
4. Use proper column existence checks from `information_schema`
