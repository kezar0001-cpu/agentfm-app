-- Ensure inspection-related enums exist before creating tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionType') THEN
    CREATE TYPE "InspectionType" AS ENUM ('ROUTINE', 'MOVE_IN', 'MOVE_OUT', 'EMERGENCY', 'COMPLIANCE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionStatus') THEN
    CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- Create the core inspection table when missing so the API can query it safely
CREATE TABLE IF NOT EXISTS "Inspection" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" "InspectionType" NOT NULL,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "completedDate" TIMESTAMP(3),
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT,
  "assignedToId" TEXT,
  "completedById" TEXT,
  "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "findings" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was created earlier without them
ALTER TABLE "Inspection"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Supporting tables required by the inspections API
CREATE TABLE IF NOT EXISTS "InspectionAttachment" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "size" INTEGER,
  "annotations" JSONB,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT,
  "inspectionId" TEXT NOT NULL
);

-- Ensure columns exist if table was created earlier without them
ALTER TABLE "InspectionAttachment"
  ADD COLUMN IF NOT EXISTS "size" INTEGER,
  ADD COLUMN IF NOT EXISTS "annotations" JSONB,
  ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

CREATE TABLE IF NOT EXISTS "InspectionReminder" (
  "id" TEXT PRIMARY KEY,
  "reminderDate" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "channel" TEXT NOT NULL,
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "inspectionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL
);

-- Ensure columns exist if table was created earlier without them
ALTER TABLE "InspectionReminder"
  ADD COLUMN IF NOT EXISTS "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS "InspectionAuditLog" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL,
  "changes" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inspectionId" TEXT NOT NULL,
  "userId" TEXT
);

-- Ensure userId is nullable if table was created earlier with NOT NULL
DO $$
BEGIN
  ALTER TABLE "InspectionAuditLog" ALTER COLUMN "userId" DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Ensure the foreign keys we rely on exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Inspection_propertyId_fkey') THEN
    ALTER TABLE "Inspection"
      ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Inspection_unitId_fkey') THEN
    ALTER TABLE "Inspection"
      ADD CONSTRAINT "Inspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Inspection_assignedToId_fkey') THEN
    ALTER TABLE "Inspection"
      ADD CONSTRAINT "Inspection_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Inspection_completedById_fkey') THEN
    ALTER TABLE "Inspection"
      ADD CONSTRAINT "Inspection_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionAttachment_inspectionId_fkey') THEN
    ALTER TABLE "InspectionAttachment"
      ADD CONSTRAINT "InspectionAttachment_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionAttachment_uploadedById_fkey') THEN
    ALTER TABLE "InspectionAttachment"
      ADD CONSTRAINT "InspectionAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionReminder_inspectionId_fkey') THEN
    ALTER TABLE "InspectionReminder"
      ADD CONSTRAINT "InspectionReminder_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionReminder_userId_fkey') THEN
    ALTER TABLE "InspectionReminder"
      ADD CONSTRAINT "InspectionReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionAuditLog_inspectionId_fkey') THEN
    ALTER TABLE "InspectionAuditLog"
      ADD CONSTRAINT "InspectionAuditLog_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InspectionAuditLog_userId_fkey') THEN
    ALTER TABLE "InspectionAuditLog"
      ADD CONSTRAINT "InspectionAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Helpful indexes so the inspections list query stays fast
CREATE INDEX IF NOT EXISTS "Inspection_propertyId_idx" ON "Inspection"("propertyId");
CREATE INDEX IF NOT EXISTS "Inspection_unitId_idx" ON "Inspection"("unitId");
CREATE INDEX IF NOT EXISTS "Inspection_assignedToId_idx" ON "Inspection"("assignedToId");
CREATE INDEX IF NOT EXISTS "Inspection_status_idx" ON "Inspection"("status");
CREATE INDEX IF NOT EXISTS "Inspection_scheduledDate_idx" ON "Inspection"("scheduledDate");

CREATE INDEX IF NOT EXISTS "InspectionAttachment_inspectionId_idx" ON "InspectionAttachment"("inspectionId");
CREATE INDEX IF NOT EXISTS "InspectionReminder_inspectionId_idx" ON "InspectionReminder"("inspectionId");
CREATE INDEX IF NOT EXISTS "InspectionReminder_reminderDate_idx" ON "InspectionReminder"("reminderDate");
CREATE INDEX IF NOT EXISTS "InspectionAuditLog_inspectionId_idx" ON "InspectionAuditLog"("inspectionId");
CREATE INDEX IF NOT EXISTS "InspectionAuditLog_timestamp_idx" ON "InspectionAuditLog"("timestamp");
