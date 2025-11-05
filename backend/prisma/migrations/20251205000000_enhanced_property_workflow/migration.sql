-- CreateEnum for DocumentCategory
CREATE TYPE "DocumentCategory" AS ENUM ('LEASE', 'INSURANCE', 'CERTIFICATE', 'INSPECTION', 'TAX_DOCUMENT', 'WARRANTY', 'MAINTENANCE', 'DEED', 'MORTGAGE', 'APPRAISAL', 'OTHER');

-- CreateEnum for DocumentAccessLevel
CREATE TYPE "DocumentAccessLevel" AS ENUM ('PUBLIC', 'TENANT', 'OWNER', 'PROPERTY_MANAGER');

-- AlterEnum to expand PropertyStatus
ALTER TYPE "PropertyStatus" ADD VALUE 'FOR_SALE';
ALTER TYPE "PropertyStatus" ADD VALUE 'FOR_RENT';
ALTER TYPE "PropertyStatus" ADD VALUE 'UNDER_CONTRACT';
ALTER TYPE "PropertyStatus" ADD VALUE 'SOLD';
ALTER TYPE "PropertyStatus" ADD VALUE 'RENTED';
ALTER TYPE "PropertyStatus" ADD VALUE 'UNDER_RENOVATION';

-- AlterTable Property - Add new columns
ALTER TABLE "Property" ADD COLUMN "lotSize" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "buildingSize" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "numberOfFloors" INTEGER;
ALTER TABLE "Property" ADD COLUMN "constructionType" TEXT;
ALTER TABLE "Property" ADD COLUMN "heatingSystem" TEXT;
ALTER TABLE "Property" ADD COLUMN "coolingSystem" TEXT;
ALTER TABLE "Property" ADD COLUMN "amenities" JSONB;
ALTER TABLE "Property" ADD COLUMN "purchasePrice" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "purchaseDate" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "currentMarketValue" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "annualPropertyTax" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "annualInsurance" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "monthlyHOA" DOUBLE PRECISION;

-- CreateTable PropertyImage
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable PropertyDocument
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "description" TEXT,
    "accessLevel" "DocumentAccessLevel" NOT NULL DEFAULT 'PROPERTY_MANAGER',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable PropertyNote
CREATE TABLE "PropertyNote" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");
CREATE INDEX "PropertyImage_isPrimary_idx" ON "PropertyImage"("isPrimary");
CREATE INDEX "PropertyImage_displayOrder_idx" ON "PropertyImage"("displayOrder");

-- CreateIndex
CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");
CREATE INDEX "PropertyDocument_category_idx" ON "PropertyDocument"("category");
CREATE INDEX "PropertyDocument_accessLevel_idx" ON "PropertyDocument"("accessLevel");

-- CreateIndex
CREATE INDEX "PropertyNote_propertyId_idx" ON "PropertyNote"("propertyId");
CREATE INDEX "PropertyNote_userId_idx" ON "PropertyNote"("userId");
CREATE INDEX "PropertyNote_createdAt_idx" ON "PropertyNote"("createdAt");

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyNote" ADD CONSTRAINT "PropertyNote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyNote" ADD CONSTRAINT "PropertyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
