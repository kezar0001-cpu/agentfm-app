# Deployment Recovery Guide

## Current Situation

The deployment is failing because a previous migration attempt failed and left the database in a "failed migration" state. Prisma refuses to apply new migrations when there are failed migrations in the history.

## Quick Fix (For Render.com or similar platforms)

### Step 1: Mark the Failed Migration as Rolled Back

You need to connect to your production database and run this SQL command:

```sql
UPDATE "_prisma_migrations"
SET 
  rolled_back_at = NOW(),
  logs = COALESCE(logs, '') || E'\n\n--- MANUAL ROLLBACK ---\nMarked as rolled back to allow re-application with column existence fixes.\nOriginal error: column "uploadedById" referenced in foreign key constraint does not exist\nFix: Added ALTER TABLE statements to ensure columns exist before adding constraints.'
WHERE migration_name = '20251115000000_create_missing_inspection_tables'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;
```

### Step 2: Merge the Fix to Main Branch

The fix is currently on branch `fix/inspection-migration-column-order`. You need to:

1. Review the changes
2. Merge to main branch
3. Push to trigger a new deployment

```bash
git checkout main
git merge fix/inspection-migration-column-order
git push origin main
```

### Step 3: Redeploy

Once the fix is merged to main, trigger a new deployment. The migration will now succeed because:
- The failed migration is marked as rolled back
- The fixed migration includes column existence checks
- Columns are added before foreign key constraints

## Alternative: Using Render Shell

If you have access to Render's shell feature:

1. Go to your Render dashboard
2. Open the shell for your backend service
3. Run:
   ```bash
   npx prisma migrate resolve --rolled-back 20251115000000_create_missing_inspection_tables
   ```
4. Trigger a manual deploy

## What the Fix Does

The updated migration now:

1. **Creates tables** with `CREATE TABLE IF NOT EXISTS`
2. **Adds missing columns** with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
3. **Then adds foreign keys** only after ensuring columns exist

This makes the migration idempotent and safe to run multiple times.

## Verification

After successful deployment, verify the migration status:

```sql
SELECT migration_name, 
       finished_at IS NOT NULL as completed,
       rolled_back_at IS NOT NULL as rolled_back,
       started_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

All migrations should show `completed = true` and `rolled_back = false`.

## Prevention

To prevent this in the future:

1. Always test migrations locally first
2. Use `ADD COLUMN IF NOT EXISTS` for existing tables
3. Add columns before adding foreign key constraints
4. Test migrations against databases in various states
5. Use staging environment before production

## Need Help?

If you encounter issues:

1. Check the `_prisma_migrations` table for migration status
2. Review the `logs` column for error details
3. Ensure the database user has sufficient permissions
4. Verify the DATABASE_URL is correct

## Files Changed

- `backend/prisma/migrations/20251115000000_create_missing_inspection_tables/migration.sql` - Fixed
- `backend/prisma/migrations/20251201000000_align_inspection_schema/migration.sql` - Improved
- `backend/resolve-failed-migration.sql` - Resolution script
- `MIGRATION_FIX.md` - Technical details
- `DEPLOYMENT_RECOVERY.md` - This guide
