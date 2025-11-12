-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "PropertyDocumentCategory" AS ENUM ('LEASE_AGREEMENT', 'INSURANCE', 'PERMIT', 'INSPECTION_REPORT', 'MAINTENANCE_RECORD', 'FINANCIAL', 'LEGAL', 'PHOTOS', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "PropertyDocumentAccessLevel" AS ENUM ('PUBLIC', 'TENANT', 'OWNER', 'PROPERTY_MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing table if it exists (to ensure clean state)
DROP TABLE IF EXISTS "PropertyDocument";

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "PropertyDocumentCategory" NOT NULL,
    "description" TEXT,
    "accessLevel" "PropertyDocumentAccessLevel" NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyDocument_uploaderId_idx" ON "PropertyDocument"("uploaderId");

-- CreateIndex
CREATE INDEX "PropertyDocument_category_idx" ON "PropertyDocument"("category");

-- CreateIndex
CREATE INDEX "PropertyDocument_accessLevel_idx" ON "PropertyDocument"("accessLevel");

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
