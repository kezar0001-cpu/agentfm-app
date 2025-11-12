-- Fix UnitImage table: Rename uploadedBy to uploadedById for consistency
-- This handles the case where the column was created as 'uploadedBy' instead of 'uploadedById'
-- Applies the same fix pattern that was used for PropertyImage table

DO $$
BEGIN
    -- Check if uploadedBy column exists (wrong name)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'UnitImage'
        AND column_name = 'uploadedBy'
    ) THEN
        -- Check if uploadedById already exists (correct name)
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'UnitImage'
            AND column_name = 'uploadedById'
        ) THEN
            -- Both columns exist - drop the wrong one
            ALTER TABLE "UnitImage" DROP COLUMN "uploadedBy";
            RAISE NOTICE 'Dropped duplicate uploadedBy column (kept uploadedById)';
        ELSE
            -- Only uploadedBy exists - rename it to uploadedById
            ALTER TABLE "UnitImage" RENAME COLUMN "uploadedBy" TO "uploadedById";
            RAISE NOTICE 'Renamed uploadedBy column to uploadedById';
        END IF;
    ELSE
        -- uploadedBy doesn't exist, check if uploadedById exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'UnitImage'
            AND column_name = 'uploadedById'
        ) THEN
            -- Neither exists - add uploadedById
            ALTER TABLE "UnitImage" ADD COLUMN "uploadedById" TEXT;
            RAISE NOTICE 'Added uploadedById column to UnitImage table';
        ELSE
            RAISE NOTICE 'uploadedById column already exists - no action needed';
        END IF;
    END IF;

    -- Ensure uploadedById is nullable (not NOT NULL)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'UnitImage'
        AND column_name = 'uploadedById'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "UnitImage" ALTER COLUMN "uploadedById" DROP NOT NULL;
        RAISE NOTICE 'Made uploadedById column nullable';
    END IF;
END $$;
