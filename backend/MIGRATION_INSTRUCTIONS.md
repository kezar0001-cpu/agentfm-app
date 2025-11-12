# Property Documents Migration Instructions

This migration adds the PropertyDocument feature with direct file upload capability.

## Database Changes
- Adds `PropertyDocument` table
- Adds `PropertyDocumentCategory` enum
- Adds `PropertyDocumentAccessLevel` enum
- Creates indexes for performance
- Sets up foreign key relationships

## Option 1: Using Prisma Migrate (Recommended for Development)

```bash
cd backend
npx prisma migrate deploy
```

This will apply the migration at `prisma/migrations/20251112120000_add_property_documents/migration.sql`

## Option 2: Using Direct SQL (Recommended for Production)

If you have direct database access:

```bash
cd backend
psql $DATABASE_URL -f apply-property-documents-migration.sql
```

Or if using a different PostgreSQL client, run the SQL file manually.

## Option 3: Using Node.js Script

```bash
cd backend
node scripts/apply-property-documents-migration.js
```

## After Migration

1. **Regenerate Prisma Client** (if not done automatically):
   ```bash
   npx prisma generate
   ```

2. **Restart your backend server** to pick up the new schema changes

3. **Verify the migration**:
   ```bash
   npx prisma studio
   ```
   Check that the `PropertyDocument` table exists with all fields.

## Troubleshooting

### Error: Column 'uploaderId' does not exist
This means the migration hasn't been applied yet. Follow one of the options above.

### Error: Type 'PropertyDocumentCategory' already exists
The migration script handles this gracefully. The enum will be reused if it exists.

### Error: Table 'PropertyDocument' already exists
If the table exists but is missing columns, the migration will drop and recreate it.
**WARNING**: This will delete any existing data in the table.

## Rollback (if needed)

To rollback this migration:

```sql
DROP TABLE IF EXISTS "PropertyDocument" CASCADE;
DROP TYPE IF EXISTS "PropertyDocumentCategory";
DROP TYPE IF EXISTS "PropertyDocumentAccessLevel";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251112120000_add_property_documents';
```

## Production Deployment

For production environments (like Render), the migration should be applied automatically on deployment if you're using `npx prisma migrate deploy` in your build/start commands.

If not, add this to your build command:
```bash
npx prisma migrate deploy && npm start
```
