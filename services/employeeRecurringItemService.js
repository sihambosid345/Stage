import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

const parseDates = (data) => ({
  ...data,
  effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
  effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
});

export const createRecurringItem = async (data) => {
  return prisma.employeeRecurringItem.create({
    data: parseDates(data),
    include: includeRelations,
  });
};

export const getRecurringItems = async (companyId) => {
  const where = companyId ? { companyId } : {};
  return prisma.employeeRecurringItem.findMany({
    where,
    include: includeRelations,
    orderBy: [{ isActive: "desc" }, { effectiveFrom: "desc" }],
  });
};

export const getRecurringItemById = async (id, companyId) => {
  const where = { id };
  if (companyId) where.companyId = companyId;
  const item = await prisma.employeeRecurringItem.findFirst({
    where,
    include: includeRelations,
  });
  if (!item) throw { status: 404, message: "Recurring item not found" };
  return item;
};

export const getRecurringItemsByEmployee = async (employeeId, companyId) => {
  const where = { employeeId };
  if (companyId) where.companyId = companyId;
  return prisma.employeeRecurringItem.findMany({
    where,
    include: includeRelations,
    orderBy: [{ isActive: "desc" }, { effectiveFrom: "desc" }],
  });
};

export const updateRecurringItem = async (id, data, companyId) => {
  await getRecurringItemById(id, companyId);
  return prisma.employeeRecurringItem.update({
    where: { id },
    data: parseDates(data),
    include: includeRelations,
  });
};

export const deleteRecurringItem = async (id, companyId) => {
  await getRecurringItemById(id, companyId);
  return prisma.employeeRecurringItem.delete({ where: { id } });
};

