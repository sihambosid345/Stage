import prisma from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  payrollPeriod: { select: { id: true, year: true, month: true } },
  payrollRun: { select: { id: true, runNumber: true } },
};

export const createPayslip = async (data) => {
  return await prisma.payslip.create({ data, include: includeRelations });
};

export const getPayslips = async () => {
  return await prisma.payslip.findMany({
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getPayslipById = async (id) => {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!payslip) throw { status: 404, message: "Payslip not found" };
  return payslip;
};

export const getPayslipsByEmployee = async (employeeId) => {
  return await prisma.payslip.findMany({
    where: { employeeId },
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getPayslipsByPeriod = async (payrollPeriodId) => {
  return await prisma.payslip.findMany({
    where: { payrollPeriodId },
    include: includeRelations,
  });
};

export const updatePayslip = async (id, data) => {
  await getPayslipById(id);
  return await prisma.payslip.update({ where: { id }, data, include: includeRelations });
};

export const deletePayslip = async (id) => {
  await getPayslipById(id);
  await prisma.payslip.delete({ where: { id } });
};