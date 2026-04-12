import { prisma } from "../prismaClient.js";

export const createDepartment = async (data) =>
  prisma.department.create({ data });

export const getDepartments = async (companyId) =>
  prisma.department.findMany({ where: { companyId }, orderBy: { name: "asc" } });

export const getDepartmentById = async (id, companyId) => {
  const d = await prisma.department.findFirst({ where: { id, companyId } });
  if (!d) throw { status: 404, message: "Department not found" };
  return d;
};

export const updateDepartment = async (id, data, companyId) => {
  await getDepartmentById(id, companyId);
  return prisma.department.update({ where: { id }, data });
};

export const deleteDepartment = async (id, companyId) => {
  await getDepartmentById(id, companyId);
  return prisma.department.delete({ where: { id } });
};