-- Add uploadedById column to PropertyImage table if it doesn't exist
-- This fixes the issue where the table was created without this column

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'PropertyImage'
        AND column_name = 'uploadedById'
    ) THEN
        ALTER TABLE "PropertyImage" ADD COLUMN "uploadedById" TEXT;
        RAISE NOTICE 'Added uploadedById column to PropertyImage table';
    ELSE
        RAISE NOTICE 'uploadedById column already exists in PropertyImage table';
    END IF;
END $$;
