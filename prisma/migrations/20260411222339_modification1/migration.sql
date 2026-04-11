-- CreateEnum
CREATE TYPE "PayrollRegime" AS ENUM ('MOROCCO_STANDARD');

-- CreateEnum
CREATE TYPE "ContributionCode" AS ENUM ('CNSS_EMPLOYEE', 'CNSS_EMPLOYER', 'AMO_EMPLOYEE', 'AMO_EMPLOYER', 'TRAINING_TAX', 'FAMILY_ALLOWANCE', 'SOCIAL_BENEFITS');

-- CreateEnum
CREATE TYPE "CnssReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'VALIDATED', 'EXPORTED');

-- AlterEnum
ALTER TYPE "PayrollItemType" ADD VALUE 'AMO';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "medicalSector" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "employee_contracts" ADD COLUMN     "cnssDeclaredSalary" DECIMAL(12,2),
ADD COLUMN     "representationAllowance" DECIMAL(12,2),
ADD COLUMN     "seniorityAllowance" DECIMAL(12,2),
ADD COLUMN     "transportAllowance" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "childrenCount" INTEGER DEFAULT 0,
ADD COLUMN     "isAmoEligible" BOOLEAN DEFAULT true,
ADD COLUMN     "isCnssDeclared" BOOLEAN DEFAULT true,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "taxIdentifier" TEXT;

-- AlterTable
ALTER TABLE "payroll_runs" ADD COLUMN     "totalEmployeeCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalEmployerCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTax" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "amoBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cnssBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cnssCeilingApplied" DECIMAL(12,2),
ADD COLUMN     "declaredDays" INTEGER DEFAULT 26,
ADD COLUMN     "employeeChargesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "employerChargesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "incomeTaxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "incomeTaxBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableGross" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payroll_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "regime" "PayrollRegime" NOT NULL DEFAULT 'MOROCCO_STANDARD',
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "weeklyHours" DECIMAL(8,2),
    "monthlyHours" DECIMAL(8,2),
    "workingDaysPerMonth" DECIMAL(8,2),
    "cnssEnabled" BOOLEAN NOT NULL DEFAULT true,
    "amoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "irEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cimrEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultCnssDeclaredDays" INTEGER DEFAULT 26,
    "payslipTemplate" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statutory_rates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "code" "ContributionCode" NOT NULL,
    "label" TEXT NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "ceilingAmount" DECIMAL(12,2),
    "floorAmount" DECIMAL(12,2),
    "appliesToTaxable" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statutory_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "taxCode" TEXT NOT NULL DEFAULT 'IR_SALAIRE',
    "annualFrom" DECIMAL(12,2) NOT NULL,
    "annualTo" DECIMAL(12,2),
    "rate" DECIMAL(8,4) NOT NULL,
    "deductionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_contributions" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ceilingAmount" DECIMAL(12,2),
    "rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "employeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnss_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "status" "CnssReportStatus" NOT NULL DEFAULT 'DRAFT',
    "affiliationNumber" TEXT,
    "totalDeclaredDays" INTEGER NOT NULL DEFAULT 0,
    "totalGrossSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCnssBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalEmployeeShare" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalEmployerShare" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalTrainingTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cnss_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cnss_report_lines" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cnssNumber" TEXT,
    "employeeName" TEXT NOT NULL,
    "matricule" TEXT,
    "declaredDays" INTEGER NOT NULL DEFAULT 0,
    "grossSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "realBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ceilingBase" DECIMAL(12,2),
    "employeeShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amoAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "trainingTaxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cnss_report_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configs_companyId_key" ON "payroll_configs"("companyId");

-- CreateIndex
CREATE INDEX "statutory_rates_code_effectiveFrom_effectiveTo_idx" ON "statutory_rates"("code", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "statutory_rates_companyId_code_idx" ON "statutory_rates"("companyId", "code");

-- CreateIndex
CREATE INDEX "tax_brackets_taxCode_effectiveFrom_effectiveTo_idx" ON "tax_brackets"("taxCode", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "tax_brackets_companyId_taxCode_idx" ON "tax_brackets"("companyId", "taxCode");

-- CreateIndex
CREATE INDEX "payslip_contributions_payslipId_code_idx" ON "payslip_contributions"("payslipId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cnss_reports_payrollPeriodId_key" ON "cnss_reports"("payrollPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "cnss_reports_companyId_payrollPeriodId_key" ON "cnss_reports"("companyId", "payrollPeriodId");

-- CreateIndex
CREATE INDEX "cnss_report_lines_reportId_idx" ON "cnss_report_lines"("reportId");

-- CreateIndex
CREATE INDEX "cnss_report_lines_employeeId_idx" ON "cnss_report_lines"("employeeId");

-- CreateIndex
CREATE INDEX "variable_items_payrollPeriodId_idx" ON "variable_items"("payrollPeriodId");

-- AddForeignKey
ALTER TABLE "payroll_configs" ADD CONSTRAINT "payroll_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statutory_rates" ADD CONSTRAINT "statutory_rates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variable_items" ADD CONSTRAINT "variable_items_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_contributions" ADD CONSTRAINT "payslip_contributions_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnss_reports" ADD CONSTRAINT "cnss_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnss_reports" ADD CONSTRAINT "cnss_reports_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnss_report_lines" ADD CONSTRAINT "cnss_report_lines_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "cnss_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cnss_report_lines" ADD CONSTRAINT "cnss_report_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
