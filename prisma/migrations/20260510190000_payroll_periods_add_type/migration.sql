-- PayrollPeriod.type (Prisma) was missing from initial payroll_periods table.

DO $$ BEGIN
  CREATE TYPE "PayrollPeriodType" AS ENUM ('MONTHLY', 'WEEKLY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "type" "PayrollPeriodType" NOT NULL DEFAULT 'MONTHLY';

CREATE INDEX IF NOT EXISTS "payroll_periods_companyId_type_idx" ON "payroll_periods"("companyId", "type");
