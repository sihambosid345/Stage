import { prisma } from './prismaClient.js';
import { calculateEmployeePayroll } from './services/payrollCalculationService.js';

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function loadStatutoryRates(companyId, effectiveDate) {
  const rows = await prisma.statutoryRate.findMany({
    where: {
      AND: [
        { OR: [{ companyId }, { companyId: null }] },
        { effectiveFrom: { lte: effectiveDate } },
        { OR: [{ effectiveTo: { gte: effectiveDate } }, { effectiveTo: null }] },
        { isActive: true },
      ],
    },
    orderBy: [
      { companyId: 'desc' },
      { effectiveFrom: 'desc' },
    ],
  });

  const rateMap = {};
  for (const row of rows) {
    if (!rateMap[row.code]) {
      rateMap[row.code] = row;
    }
  }
  return rateMap;
}

async function loadTaxBrackets(companyId, effectiveDate, taxCode = 'IR_SALAIRE') {
  const rows = await prisma.taxBracket.findMany({
    where: {
      AND: [
        { taxCode },
        { OR: [{ companyId }, { companyId: null }] },
        { effectiveFrom: { lte: effectiveDate } },
        { OR: [{ effectiveTo: { gte: effectiveDate } }, { effectiveTo: null }] },
        { isActive: true },
      ],
    },
    orderBy: [{ annualFrom: 'asc' }],
  });

  return rows.map((b) => ({
    min: round2(Number(b.annualFrom) / 12),
    max: b.annualTo != null ? round2(Number(b.annualTo) / 12) : Infinity,
    rate: Number(b.rate),
    deduction: round2(Number(b.deductionAmount) / 12),
  }));
}

async function main() {
  const runs = await prisma.payrollRun.findMany({ include: { payrollPeriod: true }, orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('RUNS FOUND', runs.map((r) => ({ id: r.id, companyId: r.companyId, status: r.status, period: r.payrollPeriod ? `${r.payrollPeriod.year}-${r.payrollPeriod.month}` : null })));
  if (runs.length === 0) {
    await prisma.$disconnect();
    return;
  }
  const run = runs[0];
  const runId = run.id;
  console.log('USING RUN', { id: run.id, companyId: run.companyId, status: run.status, period: run.payrollPeriod ? `${run.payrollPeriod.year}-${run.payrollPeriod.month}` : null });
  if (!run || !run.payrollPeriod) {
    await prisma.$disconnect();
    return;
  }

  const effectiveDate = run.payrollPeriod.endDate;
  const rates = await loadStatutoryRates(run.companyId, effectiveDate);
  console.log('STATUTORY RATE CODES', Object.keys(rates).sort());
  console.log('SAMPLE RATES', {
    CNSS_EMPLOYEE: rates.CNSS_EMPLOYEE?.rate,
    AMO_EMPLOYEE: rates.AMO_EMPLOYEE?.rate,
    CIMR_EMPLOYEE: rates.CIMR_EMPLOYEE?.rate,
    CNSS_EMPLOYER: rates.CNSS_EMPLOYER?.rate,
    AMO_EMPLOYER: rates.AMO_EMPLOYER?.rate,
    CIMR_EMPLOYER: rates.CIMR_EMPLOYER?.rate,
    TRAINING_TAX: rates.TRAINING_TAX?.rate,
    FAMILY_ALLOWANCE: rates.FAMILY_ALLOWANCE?.rate,
    SOCIAL_BENEFITS: rates.SOCIAL_BENEFITS?.rate,
  });

  const tax = await loadTaxBrackets(run.companyId, effectiveDate);
  console.log('IR BRACKETS COUNT', tax.length);
  console.log('IR BRACKETS SAMPLE', tax.slice(0, 5));

  const employee = await prisma.employee.findFirst({
    where: { companyId: run.companyId, status: 'ACTIVE' },
  });
  console.log('EMPLOYEE', employee ? { id: employee.id, name: `${employee.firstName} ${employee.lastName}` } : 'none');

  if (employee) {
    const config = await prisma.payrollConfig.findUnique({ where: { companyId: run.companyId } });
    console.log('PAYROLL CONFIG', config ? { cnssEnabled: config.cnssEnabled, amoEnabled: config.amoEnabled, cimrEnabled: config.cimrEnabled, irEnabled: config.irEnabled } : 'missing');
    const result = await calculateEmployeePayroll(employee.id, run.payrollPeriodId, runId);
    console.log('RESULT', {
      grossSalary: result.grossSalary,
      totalEmpCharges: result.totalEmpCharges,
      irAmount: result.irAmount,
      totalDeductions: result.totalDeductions,
      netSalary: result.netSalary,
      cnssEmpAmount: result.cnssEmpAmount,
      amoEmpAmount: result.amoEmpAmount,
      cimrEmpAmount: result.cimrEmpAmount,
    });

    const storedPayslip = await prisma.payslip.findFirst({
      where: { payrollRunId: runId, employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
    console.log('STORED PAYSLIP', storedPayslip ? {
      grossSalary: storedPayslip.grossSalary,
      netSalary: storedPayslip.netSalary,
      totalDeductions: storedPayslip.totalDeductions,
      totalAdvances: storedPayslip.totalAdvances,
      incomeTaxAmount: storedPayslip.incomeTaxAmount,
      employeeChargesTotal: storedPayslip.employeeChargesTotal,
      totalCnss: storedPayslip.totalCnss,
    } : 'none');

    const storedRun = await prisma.payrollRun.findUnique({ where: { id: runId } });
    console.log('STORED RUN', storedRun ? {
      totalGross: storedRun.totalGross,
      totalNet: storedRun.totalNet,
      totalDeductions: storedRun.totalDeductions,
      totalEmployerCharges: storedRun.totalEmployerCharges,
    } : 'none');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
});