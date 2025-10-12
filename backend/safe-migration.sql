-- Migration: add_rbac_system_safe
-- This migration safely adds RBAC system to existing database

-- Step 1: Create UserRole enum
DO $$ BEGIN
 CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to Org table with defaults
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Modify User table
-- Add isActive column with default
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add role column as text first (to preserve data), then convert
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_new" "UserRole";

-- Convert existing roles to new enum (map old string roles to new enum)
UPDATE "User" SET "role_new" = 
  CASE 
    WHEN "role" = 'client' THEN 'PROPERTY_MANAGER'::"UserRole"
    WHEN "role" = 'admin' THEN 'ADMIN'::"UserRole"
    WHEN "role" = 'tenant' THEN 'TENANT'::"UserRole"
    WHEN "role" = 'technician' THEN 'TECHNICIAN'::"UserRole"
    WHEN "role" = 'owner' THEN 'OWNER'::"UserRole"
    ELSE 'TENANT'::"UserRole"
  END;

-- Drop old role column and rename new one
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'TENANT'::"UserRole";

-- Step 4: Create new profile tables
CREATE TABLE IF NOT EXISTS "TenantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "preferredChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "language" TEXT NOT NULL DEFAULT 'EN',
    "accessibilityNeeds" TEXT,
    "petNote" TEXT,
    "entryPermission" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TechnicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certifications" JSONB,
    "specialties" JSONB,
    "licenseNumber" TEXT,
    "emergencyContact" TEXT,
    "canAccessAllProperties" BOOLEAN NOT NULL DEFAULT false,
    "propertyAccess" JSONB,
    "currentCheckIn" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicianProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PropertyManagerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managedProperties" JSONB,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyManagerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OwnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownedProperties" JSONB,
    "assignedBy" TEXT,
    "viewOnlyAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "maintenanceRequestId" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "checkInData" JSONB,
    "checkOutData" JSONB,
    "safetyCheckCompleted" BOOLEAN NOT NULL DEFAULT false,
    "safetyCheckData" JSONB,
    "workPerformed" TEXT,
    "materialsUsed" JSONB,
    "timeSpentMinutes" INTEGER,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "TenantProfile_userId_key" ON "TenantProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyManagerProfile_userId_key" ON "PropertyManagerProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "OwnerProfile_userId_key" ON "OwnerProfile"("userId");

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS "Job_assignedToId_idx" ON "Job"("assignedToId");
CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status");
CREATE INDEX IF NOT EXISTS "Job_propertyId_idx" ON "Job"("propertyId");
CREATE INDEX IF NOT EXISTS "Job_createdById_idx" ON "Job"("createdById");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Step 7: Add foreign keys
ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TechnicianProfile" ADD CONSTRAINT "TechnicianProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyManagerProfile" ADD CONSTRAINT "PropertyManagerProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OwnerProfile" ADD CONSTRAINT "OwnerProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_assignedToId_fkey" 
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Create profiles for existing users based on their roles
INSERT INTO "TenantProfile" ("id", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" 
WHERE "role" = 'TENANT'::"UserRole" 
  AND NOT EXISTS (SELECT 1 FROM "TenantProfile" WHERE "TenantProfile"."userId" = "User"."id");

INSERT INTO "PropertyManagerProfile" ("id", "userId", "managedProperties", "permissions", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", '[]'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" 
WHERE "role" = 'PROPERTY_MANAGER'::"UserRole"
  AND NOT EXISTS (SELECT 1 FROM "PropertyManagerProfile" WHERE "PropertyManagerProfile"."userId" = "User"."id");

INSERT INTO "TechnicianProfile" ("id", "userId", "canAccessAllProperties", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" 
WHERE "role" = 'TECHNICIAN'::"UserRole"
  AND NOT EXISTS (SELECT 1 FROM "TechnicianProfile" WHERE "TechnicianProfile"."userId" = "User"."id");

INSERT INTO "OwnerProfile" ("id", "userId", "viewOnlyAccess", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" 
WHERE "role" = 'OWNER'::"UserRole"
  AND NOT EXISTS (SELECT 1 FROM "OwnerProfile" WHERE "OwnerProfile"."userId" = "User"."id");
