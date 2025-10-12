# Database Migration Guide - Role-Based Access Control

This guide will help you migrate from the old role system to the new RBAC system.

## Overview of Changes

### New Features
- ✅ 5 distinct user roles: ADMIN, PROPERTY_MANAGER, OWNER, TECHNICIAN, TENANT
- ✅ Role-specific profiles with dedicated fields
- ✅ Property-level access control
- ✅ Job management system for technicians
- ✅ Owner simplified dashboard access
- ✅ Granular permissions system

### Database Changes
1. **User.role** changed from String to Enum (UserRole)
2. Added **TechnicianProfile** model
3. Added **PropertyManagerProfile** model
4. Added **OwnerProfile** model
5. Added **Job** model for technician workflows
6. Added User.isActive field
7. Added relationships for job assignments

## Migration Steps

### Step 1: Backup Your Database
```bash
# If using PostgreSQL
pg_dump -U your_username -d your_database > backup_$(date +%Y%m%d).sql

# Or using Prisma
npx prisma db pull
```

### Step 2: Apply the Schema Changes
```bash
# Navigate to backend directory
cd backend

# Generate Prisma client with new schema
npx prisma generate

# Create migration
npx prisma migrate dev --name add_rbac_system

# This will:
# - Create the new enum UserRole
# - Add new profile tables
# - Add Job table
# - Update User table with new fields
```

### Step 3: Migrate Existing User Roles

Run this migration script to convert old string roles to new enum roles:

```javascript
// scripts/migrate-roles.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('Starting role migration...');

  // Map old role strings to new enum values
  const roleMapping = {
    'client': 'PROPERTY_MANAGER',
    'admin': 'ADMIN',
    'tenant': 'TENANT',
    'technician': 'TECHNICIAN',
    'owner': 'OWNER'
  };

  try {
    // Get all users
    const users = await prisma.user.findMany();

    for (const user of users) {
      const oldRole = user.role?.toLowerCase() || 'tenant';
      const newRole = roleMapping[oldRole] || 'TENANT';

      console.log(`Migrating user ${user.email}: ${oldRole} -> ${newRole}`);

      // Update user role
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          role: newRole,
          isActive: true
        }
      });

      // Create appropriate profile
      switch (newRole) {
        case 'ADMIN':
          // Admins don't need a specific profile
          break;

        case 'PROPERTY_MANAGER':
          await prisma.propertyManagerProfile.upsert({
            where: { userId: user.id },
            create: { 
              userId: user.id,
              managedProperties: [], // Can be updated later
              permissions: {}
            },
            update: {}
          });
          break;

        case 'TECHNICIAN':
          await prisma.technicianProfile.upsert({
            where: { userId: user.id },
            create: { 
              userId: user.id,
              canAccessAllProperties: false,
              propertyAccess: []
            },
            update: {}
          });
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
          break;

        case 'TENANT':
          // TenantProfile already exists from old schema
          if (!user.tenantProfile) {
            await prisma.tenantProfile.create({
              data: { userId: user.id }
            });
          }
          break;
      }
    }

    console.log('✅ Role migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles()
  .catch(console.error);
```

### Step 4: Run the Migration Script
```bash
# Make the script executable
node backend/scripts/migrate-roles.js
```

### Step 5: Verify the Migration
```bash
# Check that all users have roles
npx prisma studio

# Or query directly
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ include: { tenantProfile: true, technicianProfile: true, propertyManagerProfile: true, ownerProfile: true } })
  .then(users => console.log(JSON.stringify(users, null, 2)))
  .finally(() => prisma.\$disconnect());
"
```

## What Changed

### Before
```javascript
// Old role system
user.role = "client"  // Just a string
```

### After
```javascript
// New role system
user.role = "PROPERTY_MANAGER"  // Enum value
user.propertyManagerProfile = {
  managedProperties: ["prop-1", "prop-2"],
  permissions: { canCreateJobs: true }
}
```

## Setting Up Initial Roles

### Creating an Admin
```javascript
import { assignRole } from './src/utils/roleManager.js';

await assignRole(prisma, userId, 'ADMIN');
```

### Creating a Property Manager
```javascript
import { assignRole, grantPropertyManagerAccess } from './src/utils/roleManager.js';

// Assign role
await assignRole(prisma, userId, 'PROPERTY_MANAGER');

// Grant access to properties
await grantPropertyManagerAccess(prisma, userId, ['property-id-1', 'property-id-2']);
```

### Creating a Technician
```javascript
import { createTechnician, grantTechnicianAccess } from './src/utils/roleManager.js';

// Create technician
const tech = await createTechnician(prisma, {
  email: 'tech@example.com',
  name: 'John Technician',
  orgId: 'org-id'
}, {
  certifications: ['Electrical', 'Plumbing'],
  specialties: ['HVAC', 'Electrical']
});

// Grant access to specific properties
await grantTechnicianAccess(prisma, tech.id, ['property-id-1']);
```

### Creating an Owner
```javascript
import { createOwnerForProperties } from './src/utils/roleManager.js';

const owner = await createOwnerForProperties(
  prisma,
  propertyManagerId,  // Who's creating this owner
  {
    email: 'owner@example.com',
    name: 'Property Owner',
    orgId: 'org-id'
  },
  ['property-id-1', 'property-id-2']  // Properties they own
);
```

## Troubleshooting

### Error: "Invalid enum value"
If you get this error, it means there are still old string roles in the database. Run the migration script again.

### Error: "Profile already exists"
This is expected if you run the migration multiple times. The script uses `upsert` to handle this safely.

### Testing the New System
```bash
# Run tests
npm test

# Or manually test role authorization
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/admin/users
# Should work for ADMIN, fail for others
```

## Next Steps

After migration:
1. ✅ Test role-based access in the frontend
2. ✅ Update API routes to use new middleware
3. ✅ Create role-specific dashboards
4. ✅ Configure permissions for property managers
5. ✅ Test technician workflows (jobs, check-in/out)

## Rollback Plan

If something goes wrong:
```bash
# Restore from backup
psql -U your_username -d your_database < backup_YYYYMMDD.sql

# Or use Prisma to rollback
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```
