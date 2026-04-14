/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'EMPLOYEE', 'VIEWER');

-- DropIndex
DROP INDEX "users_companyId_role_status_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "companyId" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE';

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_isSuperAdmin_idx" ON "users"("isSuperAdmin");
