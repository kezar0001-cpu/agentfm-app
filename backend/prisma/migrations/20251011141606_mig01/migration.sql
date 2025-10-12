/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Org` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OwnerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyManagerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TechnicianProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TenantProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OwnerProfile" DROP CONSTRAINT "OwnerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyManagerProfile" DROP CONSTRAINT "PropertyManagerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianProfile" DROP CONSTRAINT "TechnicianProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "TenantProfile" DROP CONSTRAINT "TenantProfile_userId_fkey";

-- DropIndex
DROP INDEX "User_isActive_idx";

-- AlterTable
ALTER TABLE "Org" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isActive",
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'owner';

-- DropTable
DROP TABLE "Job";

-- DropTable
DROP TABLE "OwnerProfile";

-- DropTable
DROP TABLE "PropertyManagerProfile";

-- DropTable
DROP TABLE "TechnicianProfile";

-- DropTable
DROP TABLE "TenantProfile";

-- DropEnum
DROP TYPE "UserRole";
