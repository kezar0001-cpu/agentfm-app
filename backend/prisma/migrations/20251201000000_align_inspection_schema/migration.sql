-- Align inspection-related tables with application schema
-- This migration is now redundant as these changes were incorporated into
-- the previous migration, but kept for backward compatibility

DO $$
BEGIN
  -- Ensure tags column exists on Inspection table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Inspection' AND column_name = 'tags'
  ) THEN
    ALTER TABLE "Inspection" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Ensure InspectionAttachment columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'InspectionAttachment' AND column_name = 'size'
  ) THEN
    ALTER TABLE "InspectionAttachment" ADD COLUMN "size" INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'InspectionAttachment' AND column_name = 'annotations'
  ) THEN
    ALTER TABLE "InspectionAttachment" ADD COLUMN "annotations" JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'InspectionAttachment' AND column_name = 'uploadedById'
  ) THEN
    ALTER TABLE "InspectionAttachment" ADD COLUMN "uploadedById" TEXT;
  END IF;

  -- Ensure InspectionReminder columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'InspectionReminder' AND column_name = 'recipients'
  ) THEN
    ALTER TABLE "InspectionReminder" ADD COLUMN "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'InspectionReminder' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE "InspectionReminder" ADD COLUMN "metadata" JSONB;
  END IF;

  -- Ensure userId is nullable in InspectionAuditLog
  BEGIN
    ALTER TABLE "InspectionAuditLog" ALTER COLUMN "userId" DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN NULL;
    WHEN others THEN NULL;
  END;

  -- Ensure foreign key for attachment uploader
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'InspectionAttachment_uploadedById_fkey'
  ) THEN
    ALTER TABLE "InspectionAttachment"
      ADD CONSTRAINT "InspectionAttachment_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
