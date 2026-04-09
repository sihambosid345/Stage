import prisma from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  payrollRun: { select: { id: true, runNumber: true, status: true } },
};

export const createItem = async (data) => {
  return await prisma.payrollItem.create({ data, include: includeRelations });
};

export const getItems = async () => {
  return await prisma.payrollItem.findMany({ include: includeRelations });
};

export const getItemById = async (id) => {
  const item = await prisma.payrollItem.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!item) throw { status: 404, message: "Payroll item not found" };
  return item;
};

export const getItemsByRun = async (payrollRunId) => {
  return await prisma.payrollItem.findMany({
    where: { payrollRunId },
    include: includeRelations,
    orderBy: { sortOrder: "asc" },
  });
};

export const getItemsByEmployee = async (employeeId) => {
  return await prisma.payrollItem.findMany({
    where: { employeeId },
    include: includeRelations,
  });
};

export const updateItem = async (id, data) => {
  await getItemById(id);
  return await prisma.payrollItem.update({ where: { id }, data, include: includeRelations });
};

export const deleteItem = async (id) => {
  await getItemById(id);
  await prisma.payrollItem.delete({ where: { id } });
};