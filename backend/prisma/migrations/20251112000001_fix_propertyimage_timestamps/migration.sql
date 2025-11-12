-- Fix PropertyImage table: Add missing createdAt and updatedAt columns
-- This handles cases where the table was created without these columns

DO $$
BEGIN
    -- Add createdAt column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'PropertyImage'
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "PropertyImage" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added createdAt column to PropertyImage table';
    ELSE
        RAISE NOTICE 'createdAt column already exists in PropertyImage table';
    END IF;

    -- Add updatedAt column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'PropertyImage'
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "PropertyImage" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updatedAt column to PropertyImage table';
    ELSE
        RAISE NOTICE 'updatedAt column already exists in PropertyImage table';
    END IF;
END $$;
