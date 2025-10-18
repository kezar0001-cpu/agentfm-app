-- Adjust property address fields for international support
ALTER TABLE "Property"
  ALTER COLUMN "state" DROP NOT NULL,
  ALTER COLUMN "zipCode" DROP NOT NULL,
  ALTER COLUMN "country" DROP DEFAULT;
