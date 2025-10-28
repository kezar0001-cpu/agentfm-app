-- Align inspection-related tables with application schema

ALTER TABLE "Inspection"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "InspectionAttachment"
  ADD COLUMN IF NOT EXISTS "size" INTEGER,
  ADD COLUMN IF NOT EXISTS "annotations" JSONB,
  ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

ALTER TABLE "InspectionAuditLog"
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "InspectionReminder"
  ADD COLUMN IF NOT EXISTS "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Ensure foreign key for attachment uploader
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'InspectionAttachment'
      AND constraint_name = 'InspectionAttachment_uploadedById_fkey'
  ) THEN
    ALTER TABLE "InspectionAttachment"
      ADD CONSTRAINT "InspectionAttachment_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
