import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

const parseDates = (data) => ({
  ...data,
  startDate: data.startDate ? new Date(data.startDate) : undefined, // ✅ fix
  endDate: data.endDate ? new Date(data.endDate) : undefined,       // ✅ fix
});

export const createPeriod = async (data) => {
  return await prisma.payrollPeriod.create({
    data: parseDates(data), // ✅ fix
    include: includeRelations,
  });
};

export const getPeriods = async () => {
  return await prisma.payrollPeriod.findMany({
    include: includeRelations,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
};

export const getPeriodById = async (id) => {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!period) throw { status: 404, message: "Payroll period not found" };
  return period;
};

export const updatePeriod = async (id, data) => {
  await getPeriodById(id);
  return await prisma.payrollPeriod.update({
    where: { id },
    data: parseDates(data), // ✅ fix
    include: includeRelations,
  });
};

export const deletePeriod = async (id) => {
  await getPeriodById(id);
  await prisma.payrollPeriod.delete({ where: { id } });
};