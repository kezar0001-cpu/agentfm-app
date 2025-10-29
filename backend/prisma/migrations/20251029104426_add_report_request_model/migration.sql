-- DropForeignKey
ALTER TABLE "public"."JobComment" DROP CONSTRAINT "JobComment_userId_fkey";

-- CreateTable
CREATE TABLE "ReportRequest" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "parameters" JSONB,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportRequest_propertyId_idx" ON "ReportRequest"("propertyId");

-- CreateIndex
CREATE INDEX "ReportRequest_unitId_idx" ON "ReportRequest"("unitId");

-- CreateIndex
CREATE INDEX "ReportRequest_requestedById_idx" ON "ReportRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ReportRequest_status_idx" ON "ReportRequest"("status");

-- AddForeignKey
ALTER TABLE "ReportRequest" ADD CONSTRAINT "ReportRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRequest" ADD CONSTRAINT "ReportRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRequest" ADD CONSTRAINT "ReportRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
