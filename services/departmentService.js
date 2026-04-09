import { prisma } from "../prismaClient.js";
export const createDepartment = async (data) => {
  return await prisma.department.create({ data });
};

export const getDepartments = async () => {
  return await prisma.department.findMany();
};

export const getDepartmentById = async (id) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw { status: 404, message: "Department not found" };
  return department;
};

export const updateDepartment = async (id, data) => {
  await getDepartmentById(id);
  return await prisma.department.update({ where: { id }, data });
};

export const deleteDepartment = async (id) => {
  await getDepartmentById(id);
  await prisma.department.delete({ where: { id } });
};