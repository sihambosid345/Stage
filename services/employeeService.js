import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
};

const formatDates = (data) => {
  return {
    ...data,
    birthDate: data.birthDate ? new Date(data.birthDate) : null,
    hireDate: data.hireDate ? new Date(data.hireDate) : null,
  };
};

export const createEmployee = async (data) => {
  return await prisma.employee.create({
    data: formatDates(data),
  });
};

export const getEmployees = async () => {
  return await prisma.employee.findMany({
    include: includeRelations,
  });
};

export const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: includeRelations,
  });

  if (!employee) {
    throw { status: 404, message: "Employee not found" };
  }

  return employee;
};

export const updateEmployee = async (id, data) => {
  await getEmployeeById(id);

  return await prisma.employee.update({
    where: { id },
    data: {
      ...formatDates(data),
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    },
  });
};

export const deleteEmployee = async (id) => {
  await getEmployeeById(id);

  return await prisma.employee.delete({
    where: { id },
  });
};