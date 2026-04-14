import { prisma } from "../prismaClient.js";
export const createCompany = async (data) => {
  return await prisma.company.create({ data });
};

export const getCompanies = async (companyId) => {
  if (companyId) {
    return await prisma.company.findMany({ where: { id: companyId } });
  }
  return await prisma.company.findMany();
};

export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw { status: 404, message: "Company not found" };
  return company;
};

export const updateCompany = async (id, data) => {
  await getCompanyById(id);
  return await prisma.company.update({ where: { id }, data });
};

export const deleteCompany = async (id) => {
  await getCompanyById(id);
  await prisma.company.delete({ where: { id } });
};