import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

const parseDates = (data) => ({
  ...data,
  effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
});

export const createVariableItem = async (data) => {
  // 🔧 CORRECTION : Récupérer le companyId de l'employé
  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
    select: { companyId: true },
  });

  if (!employee) {
    throw { status: 404, message: "Employee not found" };
  }

  if (!employee.companyId) {
    throw { status: 400, message: "Employee has no associated company" };
  }

  return await prisma.variableItem.create({
    data: {
      ...parseDates(data),
      companyId: employee.companyId, // ← AJOUTÉ ICI
    },
    include: includeRelations,
  });
};

export const getVariableItems = async () => {
  return await prisma.variableItem.findMany({ include: includeRelations });
};

export const getVariableItemById = async (id) => {
  const item = await prisma.variableItem.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!item) throw { status: 404, message: "Variable item not found" };
  return item;
};

export const getVariableItemsByEmployee = async (employeeId) => {
  return await prisma.variableItem.findMany({
    where: { employeeId },
    include: includeRelations,
    orderBy: { effectiveDate: "desc" },
  });
};

export const updateVariableItem = async (id, data) => {
  await getVariableItemById(id);
  return await prisma.variableItem.update({
    where: { id },
    data: parseDates(data),
    include: includeRelations,
  });
};

export const deleteVariableItem = async (id) => {
  await getVariableItemById(id);
  await prisma.variableItem.delete({ where: { id } });
};