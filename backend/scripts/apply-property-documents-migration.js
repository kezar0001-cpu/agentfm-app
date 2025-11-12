#!/usr/bin/env node
/**
 * Apply Property Documents Migration
 *
 * This script applies the database migration for the PropertyDocument feature.
 * Run with: node scripts/apply-property-documents-migration.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔄 Starting Property Documents migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'apply-property-documents-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration SQL from:', migrationPath);
    console.log('⚠️  WARNING: This will drop and recreate the PropertyDocument table if it exists.');
    console.log('   Any existing data in PropertyDocument will be lost.\n');

    // Split the SQL into individual statements (rough split by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute the migration using raw SQL
    console.log('🚀 Executing migration...\n');

    await prisma.$executeRawUnsafe('BEGIN;');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && statement !== 'BEGIN' && statement !== 'COMMIT') {
        try {
          console.log(`   [${i + 1}/${statements.length}] Executing...`);
          await prisma.$executeRawUnsafe(statement + ';');
        } catch (error) {
          // Some errors are expected (like enum already exists)
          if (error.message.includes('already exists') || error.message.includes('duplicate_object')) {
            console.log(`   ⚠️  Skipped (already exists)`);
          } else {
            throw error;
          }
        }
      }
    }

    await prisma.$executeRawUnsafe('COMMIT;');

    console.log('\n✅ Migration completed successfully!\n');

    // Verify the table exists
    const result = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'PropertyDocument'
      ORDER BY ordinal_position;
    `;

    if (result.length > 0) {
      console.log('✅ PropertyDocument table verified:');
      console.log('   Columns:', result.map(r => r.column_name).join(', '));
      console.log('\n🎉 All done! The PropertyDocument feature is ready to use.');
    } else {
      console.log('⚠️  Warning: Could not verify PropertyDocument table creation.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
