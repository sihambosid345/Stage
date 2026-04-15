import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
};

const formatDates = (data) => ({
  ...data,
  birthDate: data.birthDate ? new Date(data.birthDate) : null,
  hireDate: data.hireDate ? new Date(data.hireDate) : null,
});

export const createEmployee = async (data) =>
  prisma.employee.create({ data: formatDates(data), include: includeRelations });

export const getEmployees = async (companyId) =>
  prisma.employee.findMany({
    where: companyId ? { companyId } : {},
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });

export const getEmployeeById = async (id, companyId) => {
  const where = companyId ? { id, companyId } : { id };
  const employee = await prisma.employee.findFirst({
    where,
    include: includeRelations,
  });
  if (!employee) throw { status: 404, message: "Employee not found" };
  return employee;
};

export const updateEmployee = async (id, data, companyId) => {
  await getEmployeeById(id, companyId);
  return prisma.employee.update({
    where: { id },
    data: {
      ...formatDates(data),
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    },
    include: includeRelations,
  });
};

export const deleteEmployee = async (id, companyId) => {
  await getEmployeeById(id, companyId);
  return prisma.employee.delete({ where: { id } });
};