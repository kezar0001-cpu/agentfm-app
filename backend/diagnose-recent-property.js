/**
 * Property Image Upload Diagnostic Tool
 *
 * This script helps diagnose why property images are disappearing.
 * Run this after creating a property with multiple images.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseMostRecentProperty() {
  console.log('\n🔍 PROPERTY IMAGE DIAGNOSTIC\n');
  console.log('='.repeat(70));

  try {
    // Find the most recent property
    const recentProperty = await prisma.property.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        propertyImages: {
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' },
          ]
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!recentProperty) {
      console.log('❌ No properties found in database');
      return;
    }

    console.log(`\n📍 Most Recent Property:`);
    console.log(`   ID: ${recentProperty.id}`);
    console.log(`   Name: ${recentProperty.name}`);
    console.log(`   Address: ${recentProperty.address}`);
    console.log(`   Created: ${recentProperty.createdAt.toISOString()}`);
    console.log(`   Manager: ${recentProperty.manager?.firstName} ${recentProperty.manager?.lastName}`);

    console.log(`\n🖼️  Image Data:`);
    console.log(`   property.imageUrl (cover): ${recentProperty.imageUrl || '(none)'}`);
    console.log(`   propertyImages count: ${recentProperty.propertyImages.length}`);

    if (recentProperty.propertyImages.length === 0) {
      console.log(`\n❌ NO PropertyImage RECORDS FOUND!`);
      console.log(`   This is the problem - images aren't being saved to the database.`);
      console.log(`\n💡 Possible Causes:`);
      console.log(`   1. Images array not included in property creation request`);
      console.log(`   2. Backend validation rejecting the images`);
      console.log(`   3. Transaction rollback during property creation`);
      console.log(`   4. Error in normaliseSubmittedPropertyImages() function`);
    } else {
      console.log(`\n✅ PropertyImage records found:`);

      recentProperty.propertyImages.forEach((img, index) => {
        console.log(`\n   Image ${index + 1}:`);
        console.log(`     ID: ${img.id}`);
        console.log(`     URL: ${img.imageUrl}`);
        console.log(`     URL Type: ${img.imageUrl.startsWith('http') ? 'External (Cloudinary/CDN)' : 'Local (/uploads/)'}`);
        console.log(`     Primary: ${img.isPrimary}`);
        console.log(`     Display Order: ${img.displayOrder}`);
        console.log(`     Caption: ${img.caption || '(none)'}`);
        console.log(`     Created: ${img.createdAt.toISOString()}`);

        // Check if file exists for local files
        if (img.imageUrl.startsWith('/uploads/')) {
          console.log(`     ⚠️  WARNING: Using local filesystem (ephemeral!)`);
        } else if (img.imageUrl.includes('cloudinary.com')) {
          console.log(`     ✓ Using Cloudinary (persistent)`);
        }
      });

      // Check if there's a mismatch
      const primaryImage = recentProperty.propertyImages.find(img => img.isPrimary);
      if (primaryImage && recentProperty.imageUrl !== primaryImage.imageUrl) {
        console.log(`\n⚠️  MISMATCH DETECTED:`);
        console.log(`   property.imageUrl: ${recentProperty.imageUrl}`);
        console.log(`   primary PropertyImage: ${primaryImage.imageUrl}`);
        console.log(`   These should match!`);
      }
    }

    // Check for any properties created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentCount = await prisma.property.count({
      where: {
        createdAt: {
          gte: yesterday
        }
      }
    });

    const recentWithImages = await prisma.property.count({
      where: {
        createdAt: {
          gte: yesterday
        },
        propertyImages: {
          some: {}
        }
      }
    });

    console.log(`\n📊 Last 24 Hours Summary:`);
    console.log(`   Properties created: ${recentCount}`);
    console.log(`   Properties with images: ${recentWithImages}`);
    console.log(`   Properties without images: ${recentCount - recentWithImages}`);

    if (recentCount > 0 && recentWithImages === 0) {
      console.log(`\n❌ CRITICAL: All properties created in last 24 hours have NO images!`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Diagnostic complete');

  } catch (error) {
    console.error('\n❌ Error during diagnostic:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    if (error.code === 'P2021' || error.message.includes('PropertyImage')) {
      console.log('\n⚠️  PropertyImage table does NOT exist!');
      console.log('   Run: npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnoseMostRecentProperty();
