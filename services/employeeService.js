import prisma from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
};

export const createEmployee = async (data) => {
  return await prisma.employee.create({ data });
};

export const getEmployees = async () => {
  return await prisma.employee.findMany({ include: includeRelations });
};

export const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!employee) throw { status: 404, message: "Employee not found" };
  return employee;
};

export const updateEmployee = async (id, data) => {
  await getEmployeeById(id);
  return await prisma.employee.update({ where: { id }, data });
};

export const deleteEmployee = async (id) => {
  await getEmployeeById(id);
  await prisma.employee.delete({ where: { id } });
};