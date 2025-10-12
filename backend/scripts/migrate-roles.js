import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('🚀 Starting role migration to RBAC system...\n');

  // Map old role strings to new enum values
  const roleMapping = {
    'client': 'PROPERTY_MANAGER',
    'admin': 'ADMIN',
    'tenant': 'TENANT',
    'technician': 'TECHNICIAN',
    'owner': 'OWNER',
    'property_manager': 'PROPERTY_MANAGER'
  };

  let migratedCount = 0;
  let errorCount = 0;

  try {
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        tenantProfile: true
      }
    });

    console.log(`📊 Found ${users.length} users to migrate\n`);

    for (const user of users) {
      try {
        const oldRole = user.role?.toLowerCase() || 'tenant';
        const newRole = roleMapping[oldRole] || 'TENANT';

        console.log(`👤 Migrating user: ${user.email}`);
        console.log(`   Old role: ${oldRole} -> New role: ${newRole}`);

        // Update user role
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            role: newRole,
            isActive: true
          }
        });

        // Create appropriate profile based on new role
        switch (newRole) {
          case 'ADMIN':
            console.log('   ✅ Admin user - no profile needed');
            break;

          case 'PROPERTY_MANAGER':
            await prisma.propertyManagerProfile.upsert({
              where: { userId: user.id },
              create: { 
                userId: user.id,
                managedProperties: [],
                permissions: {
                  canCreateJobs: true,
                  canEditProperties: true,
                  canManageTenants: true,
                  canAssignTechnicians: true
                }
              },
              update: {}
            });
            console.log('   ✅ Created Property Manager profile');
            break;

          case 'TECHNICIAN':
            await prisma.technicianProfile.upsert({
              where: { userId: user.id },
              create: { 
                userId: user.id,
                canAccessAllProperties: false,
                propertyAccess: [],
                certifications: [],
                specialties: []
              },
              update: {}
            });
            console.log('   ✅ Created Technician profile');
            break;

          case 'OWNER':
            await prisma.ownerProfile.upsert({
              where: { userId: user.id },
              create: { 
                userId: user.id,
                ownedProperties: [],
                viewOnlyAccess: true
              },
              update: {}
            });
            console.log('   ✅ Created Owner profile');
            break;

          case 'TENANT':
            // Check if tenant profile already exists
            if (!user.tenantProfile) {
              await prisma.tenantProfile.create({
                data: { 
                  userId: user.id,
                  preferredChannel: 'EMAIL',
                  language: 'EN',
                  entryPermission: false
                }
              });
              console.log('   ✅ Created Tenant profile');
            } else {
              console.log('   ✅ Tenant profile already exists');
            }
            break;
        }

        migratedCount++;
        console.log('   ✨ Migration successful\n');

      } catch (userError) {
        console.error(`   ❌ Error migrating user ${user.email}:`, userError.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('='.repeat(50));

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!\n');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review above.\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRoles()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
