import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function diagnoseImageIssues() {
  console.log('🔍 Diagnosing Image Upload Issues\n');
  console.log('='.repeat(60));

  try {
    // Check PropertyImage table
    const imageCount = await prisma.propertyImage.count();
    console.log(`\n✓ PropertyImage table exists`);
    console.log(`  Total records in database: ${imageCount}`);

    // Get recent PropertyImage records
    const recentImages = await prisma.propertyImage.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    console.log(`\n📊 Recent PropertyImage Records:`);
    console.log('='.repeat(60));

    const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
    let filesExist = 0;
    let filesMissing = 0;

    for (const img of recentImages) {
      const urlPath = img.imageUrl;
      let fileExists = false;
      let fullPath = '';

      // Check if it's a local upload path
      if (urlPath.startsWith('/uploads/')) {
        const filename = urlPath.replace('/uploads/', '');
        fullPath = path.join(UPLOAD_DIR, filename);
        fileExists = fs.existsSync(fullPath);

        if (fileExists) {
          filesExist++;
        } else {
          filesMissing++;
        }
      } else {
        fileExists = 'N/A (external URL)';
      }

      console.log(`\nProperty: ${img.property.name}`);
      console.log(`  Image URL: ${urlPath}`);
      console.log(`  Primary: ${img.isPrimary}`);
      console.log(`  Created: ${img.createdAt.toISOString()}`);
      if (typeof fileExists === 'boolean') {
        console.log(`  File exists: ${fileExists ? '✓ YES' : '✗ NO (MISSING!)'}`);
        if (!fileExists) {
          console.log(`  Expected path: ${fullPath}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📈 Summary:`);
    console.log(`  Database records: ${imageCount}`);
    console.log(`  Files exist: ${filesExist}`);
    console.log(`  Files missing: ${filesMissing}`);

    if (filesMissing > 0) {
      console.log(`\n⚠️  WARNING: ${filesMissing} image files are missing!`);
      console.log(`\n🔧 Root Cause:`);
      console.log(`  Images are stored in ephemeral container filesystem`);
      console.log(`  Files are deleted when the container restarts/redeploys`);
      console.log(`\n✅ Solution:`);
      console.log(`  1. Use cloud storage (AWS S3, Cloudinary, etc.)`);
      console.log(`  2. Or configure a persistent volume on your hosting platform`);
    }

    // Check upload directory
    console.log(`\n📁 Upload Directory Check:`);
    console.log(`  Path: ${UPLOAD_DIR}`);
    console.log(`  Exists: ${fs.existsSync(UPLOAD_DIR)}`);

    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      console.log(`  Files in directory: ${files.length}`);
      if (files.length > 0) {
        console.log(`  Sample files:`);
        files.slice(0, 5).forEach(f => console.log(`    - ${f}`));
      }
    }

  } catch (error) {
    console.error('\n✗ Error during diagnosis:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseImageIssues();
