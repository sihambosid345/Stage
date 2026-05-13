/*
  Warnings:

  - The values [ALLOWANCE,BONUS,DEDUCTION,ADVANCE,OVERTIME,OTHER] on the enum `VariableItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SalaryCalculationType" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY', 'MISSION');

-- CreateEnum
CREATE TYPE "RecurringItemType" AS ENUM ('TRANSPORT', 'ANCIENNETE', 'INDEMNITE', 'REPRESENTATION', 'LOGEMENT', 'TELEPHONE', 'PANIER', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringValueType" AS ENUM ('FIXED', 'PERCENTAGE', 'SENIORITY_SCALE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContributionCode" ADD VALUE 'DAMANCOM';
ALTER TYPE "ContributionCode" ADD VALUE 'CIMR_EMPLOYEE';
ALTER TYPE "ContributionCode" ADD VALUE 'CIMR_EMPLOYER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayrollRegime" ADD VALUE 'MAROC_TRANSPORT';
ALTER TYPE "PayrollRegime" ADD VALUE 'MOROCCO_OFFSHORE';
ALTER TYPE "PayrollRegime" ADD VALUE 'MOROCCO_AGRICULTURAL';

-- AlterEnum
BEGIN;
CREATE TYPE "VariableItemType_new" AS ENUM ('COMMISSION', 'FRAIS', 'AVANCE', 'RETENUE', 'PRIME');
ALTER TABLE "variable_items" ALTER COLUMN "type" TYPE "VariableItemType_new" USING ("type"::text::"VariableItemType_new");
ALTER TYPE "VariableItemType" RENAME TO "VariableItemType_old";
ALTER TYPE "VariableItemType_new" RENAME TO "VariableItemType";
DROP TYPE "VariableItemType_old";
COMMIT;

-- AlterTable
ALTER TABLE "employee_contracts" ADD COLUMN     "baseRate" DECIMAL(12,4),
ADD COLUMN     "salaryCalculationType" "SalaryCalculationType" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "variable_items" ADD COLUMN     "isCnssApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTaxable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "employee_recurring_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "RecurringItemType" NOT NULL,
    "valueType" "RecurringValueType" NOT NULL DEFAULT 'FIXED',
    "code" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "percentageValue" DECIMAL(8,4),
    "seniorityRules" JSONB,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCnssApplicable" BOOLEAN NOT NULL DEFAULT false,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_recurring_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_recurring_items_companyId_employeeId_type_idx" ON "employee_recurring_items"("companyId", "employeeId", "type");

-- CreateIndex
CREATE INDEX "employee_recurring_items_companyId_isActive_idx" ON "employee_recurring_items"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "employee_recurring_items_employeeId_effectiveFrom_effective_idx" ON "employee_recurring_items"("employeeId", "effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "employee_recurring_items" ADD CONSTRAINT "employee_recurring_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_recurring_items" ADD CONSTRAINT "employee_recurring_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_recurring_items" ADD CONSTRAINT "employee_recurring_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
