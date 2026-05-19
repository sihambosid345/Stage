import { prisma } from "../prismaClient.js";

/**
 * Normalise les champs PayrollRun pour correspondre au frontend Angular.
 * totalEmployees → employeeCount
 * totalEmployerCharges → employerContributions
 */
function normalizeRun(run) {
  if (!run) return run;
  return {
    ...run,
    // Frontend reads these names
    employeeCount: run.totalEmployees ?? 0,
    employerContributions: Number(run.totalEmployerCharges ?? 0),
    totalGross: Number(run.totalGross ?? 0),
    totalNet: Number(run.totalNet ?? 0),
    totalDeductions: Number(run.totalDeductions ?? 0),
    // Period string helper (YYYY-MM)
    period: run.payrollPeriod
      ? `${run.payrollPeriod.year}-${String(run.payrollPeriod.month).padStart(2, '0')}`
      : null,
  };
}


const includeRelations = {
  company: { select: { id: true, name: true } },
  payrollPeriod: { select: { id: true, year: true, month: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
};

export const createRun = async (data) => {
  const { companyId, period, createdById, status } = data;

  if (!companyId) throw { status: 400, message: "companyId est requis" };
  if (!period)    throw { status: 400, message: "period est requis (format YYYY-MM)" };

  // Parse "2026-05" → year=2026, month=5
  const [yearStr, monthStr] = period.split("-");
  const year  = parseInt(yearStr,  10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) {
    throw { status: 400, message: "Format de période invalide. Attendu: YYYY-MM" };
  }

  // Find or create the PayrollPeriod for this company/year/month
  let payrollPeriod = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } }
  });

  if (!payrollPeriod) {
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0);   // last day of month

    payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        companyId,
        year,
        month,
        startDate,
        endDate,
        status: "OPEN",
      }
    });
  }

  // Count existing runs for this period to set runNumber
  const existingRunsCount = await prisma.payrollRun.count({
    where: { payrollPeriodId: payrollPeriod.id }
  });

  const run = await prisma.payrollRun.create({
    data: {
      companyId,
      payrollPeriodId: payrollPeriod.id,
      createdById:     createdById ?? null,
      runNumber:       existingRunsCount + 1,
      status:          status ?? "DRAFT",
    },
    include: includeRelations
  });
  return normalizeRun(run);
};

/**
 * Récupère les runs.
 * - SUPER_ADMIN sans companyId → tous les runs (toutes entreprises)
 * - SUPER_ADMIN avec companyId → runs de cette entreprise uniquement
 * - Admin/User → companyId obligatoire → runs de leur entreprise
 */
export const getRuns = async (companyId = null) => {
  const runs = await prisma.payrollRun.findMany({
    where: companyId ? { companyId } : undefined,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
  return runs.map(normalizeRun);
};

export const getRunById = async (id) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!run) throw { status: 404, message: "Payroll run not found" };
  return normalizeRun(run);
};

export const getRunsByPeriod = async (payrollPeriodId) => {
  const runs = await prisma.payrollRun.findMany({
    where: { payrollPeriodId },
    include: includeRelations,
  });
  return runs.map(normalizeRun);
};

export const updateRun = async (id, data) => {
  await getRunById(id);
  const run = await prisma.payrollRun.update({ where: { id }, data, include: includeRelations });
  return normalizeRun(run);
};

export const deleteRun = async (id) => {
  await getRunById(id);
  await prisma.payrollRun.delete({ where: { id } });
};