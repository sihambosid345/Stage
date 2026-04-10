import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
};

// ✅ Helper — nettoie et convertit les données avant envoi à Prisma
const sanitize = (data) => ({
  ...data,
  // Dates → ISO DateTime
  startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
  endsAt:   data.endsAt && data.endsAt !== "" ? new Date(data.endsAt) : undefined,
  // Nombres — supprimer si vide/null
  maxUsers:     data.maxUsers     ? Number(data.maxUsers)     : undefined,
  maxEmployees: data.maxEmployees ? Number(data.maxEmployees) : undefined,
  maxStorageMb: data.maxStorageMb ? Number(data.maxStorageMb) : undefined,
});

export const createLicense = async (data) => {
  return await prisma.license.create({
    data: sanitize(data),
    include: includeRelations,
  });
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
  return await prisma.license.update({
    where: { id },
    data: sanitize(data),
    include: includeRelations,
  });
};

export const deleteLicense = async (id) => {
  await getLicenseById(id);
  await prisma.license.delete({ where: { id } });
};