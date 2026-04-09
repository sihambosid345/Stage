import prisma from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
};

export const createLicense = async (data) => {
  return await prisma.license.create({ data, include: includeRelations });
};

export const getLicenses = async () => {
  return await prisma.license.findMany({ include: includeRelations });
};

export const getLicenseById = async (id) => {
  const license = await prisma.license.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!license) throw { status: 404, message: "License not found" };
  return license;
};

export const getLicenseByCompany = async (companyId) => {
  const license = await prisma.license.findUnique({
    where: { companyId },
    include: includeRelations,
  });
  if (!license) throw { status: 404, message: "License not found for this company" };
  return license;
};

export const updateLicense = async (id, data) => {
  await getLicenseById(id);
  return await prisma.license.update({ where: { id }, data, include: includeRelations });
};

export const deleteLicense = async (id) => {
  await getLicenseById(id);
  await prisma.license.delete({ where: { id } });
};