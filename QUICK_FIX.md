# Quick Fix for Failed Migration

## TL;DR

Run this command against your production database:

```bash
psql $DATABASE_URL -c "UPDATE \"_prisma_migrations\" SET rolled_back_at = NOW() WHERE migration_name = '20251115000000_create_missing_inspection_tables' AND finished_at IS NULL;"
```

Then merge and deploy the fix:

```bash
git checkout main
git merge fix/inspection-migration-column-order
git push origin main
```

## Or use Prisma CLI:

```bash
npx prisma migrate resolve --rolled-back 20251115000000_create_missing_inspection_tables
```

Then redeploy.

---

For detailed explanation, see [DEPLOYMENT_RECOVERY.md](DEPLOYMENT_RECOVERY.md)
