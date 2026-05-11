-- payroll_configs: columns present in schema.prisma but missing from initial CREATE TABLE.
-- Fixes prisma.payrollConfig.findUnique() / findMany() failing when the engine selects these fields.

ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "dateEffet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "overtimeHoursForRate" DECIMAL(8,2);
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "damancomEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_configs_createdById_fkey'
  ) THEN
    ALTER TABLE "payroll_configs" ADD CONSTRAINT "payroll_configs_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payroll_configs_companyId_isActive_idx" ON "payroll_configs"("companyId", "isActive");
