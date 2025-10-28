-- Script to resolve failed migration state
-- This marks the failed migration as rolled back so it can be re-applied with the fix

-- Check current migration status
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '20251115000000_create_missing_inspection_tables';

-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET 
  rolled_back_at = NOW(),
  logs = COALESCE(logs, '') || E'\n\n--- MANUAL ROLLBACK ---\nMarked as rolled back to allow re-application with column existence fixes.\nOriginal error: column "uploadedById" referenced in foreign key constraint does not exist\nFix: Added ALTER TABLE statements to ensure columns exist before adding constraints.'
WHERE migration_name = '20251115000000_create_missing_inspection_tables'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;

-- Verify the update
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name = '20251115000000_create_missing_inspection_tables';

-- Show all migrations status
SELECT migration_name, 
       finished_at IS NOT NULL as completed,
       rolled_back_at IS NOT NULL as rolled_back,
       started_at
FROM "_prisma_migrations"
ORDER BY started_at;
