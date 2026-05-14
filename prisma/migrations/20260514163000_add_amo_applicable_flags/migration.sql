-- Migration: Add amoApplicable flags to payroll_items, employee_recurring_items, variable_items
-- Correction 6 : Base AMO distincte avec son propre flag

-- AlterTable: Add amoApplicable to payroll_items
ALTER TABLE "payroll_items" ADD COLUMN "amoApplicable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add isAmoApplicable to employee_recurring_items
ALTER TABLE "employee_recurring_items" ADD COLUMN "isAmoApplicable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Change isTaxable default from false to true for employee_recurring_items
ALTER TABLE "employee_recurring_items" ALTER COLUMN "isTaxable" SET DEFAULT true;
UPDATE "employee_recurring_items" SET "isTaxable" = true WHERE "isTaxable" IS NULL OR "isTaxable" = false;

-- AlterTable: Add isAmoApplicable to variable_items
ALTER TABLE "variable_items" ADD COLUMN "isAmoApplicable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Change isTaxable default from false to true for variable_items
ALTER TABLE "variable_items" ALTER COLUMN "isTaxable" SET DEFAULT true;
UPDATE "variable_items" SET "isTaxable" = true WHERE "isTaxable" IS NULL OR "isTaxable" = false;