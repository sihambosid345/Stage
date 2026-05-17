import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  payrollPeriod: { select: { id: true, year: true, month: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
};

export const createRun = async (data) => {
  return await prisma.payrollRun.create({ data, include: includeRelations });
};

/**
 * Récupère les runs.
 * - SUPER_ADMIN sans companyId → tous les runs (toutes entreprises)
 * - SUPER_ADMIN avec companyId → runs de cette entreprise uniquement
 * - Admin/User → companyId obligatoire → runs de leur entreprise
 */
export const getRuns = async (companyId = null) => {
  return await prisma.payrollRun.findMany({
    where: companyId ? { companyId } : undefined,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getRunById = async (id) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!run) throw { status: 404, message: "Payroll run not found" };
  return run;
};

export const getRunsByPeriod = async (payrollPeriodId) => {
  return await prisma.payrollRun.findMany({
    where: { payrollPeriodId },
    include: includeRelations,
  });
};

export const updateRun = async (id, data) => {
  await getRunById(id);
  return await prisma.payrollRun.update({ where: { id }, data, include: includeRelations });
};

export const deleteRun = async (id) => {
  await getRunById(id);
  await prisma.payrollRun.delete({ where: { id } });
};