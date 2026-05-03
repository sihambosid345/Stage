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
  let license = await prisma.license.findUnique({
    where: { companyId },
    include: includeRelations,
  });
  if (!license) throw { status: 404, message: "License not found for this company" };
  
  const now = new Date();
  // Auto-expire license if end date has passed
  if (license.endsAt && license.endsAt < now && license.status !== 'EXPIRED') {
    license = await prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' },
      include: includeRelations,
    });
    
    // Also deactivate all users for this company
    await prisma.user.updateMany({
      where: { companyId, isSuperAdmin: false },
      data: { status: 'BLOCKED' }
    });
  }
  
  return license;
};

export const getActiveLicenseByCompany = async (companyId) => {
  let license = await prisma.license.findUnique({
    where: { companyId },
    select: {
      id: true,
      status: true,
      endsAt: true,
      maxUsers: true,
      maxEmployees: true,
    },
  });
  if (!license) throw { status: 403, message: "Company has no valid license" };

  const now = new Date();
  const isExpired = license.endsAt && license.endsAt < now;
  
  // Auto-update license status to EXPIRED if end date has passed
  if (isExpired && license.status !== 'EXPIRED') {
    license = await prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' },
      select: {
        id: true,
        status: true,
        endsAt: true,
        maxUsers: true,
        maxEmployees: true,
      },
    });
    
    // Also deactivate all users for this company
    await prisma.user.updateMany({
      where: { companyId, isSuperAdmin: false },
      data: { status: 'BLOCKED' }
    });
  }
  
  const isInvalidStatus = !["ACTIVE", "TRIAL"].includes(license.status);
  if (isExpired || isInvalidStatus) {
    throw { status: 403, message: "License is expired or inactive. Access to the application has been blocked." };
  }

  return license;
};

const countCompanyUsers = async (companyId) =>
  prisma.user.count({ where: { companyId, isSuperAdmin: false } });

const countCompanyEmployees = async (companyId) =>
  prisma.employee.count({ where: { companyId } });

export const enforceLicenseLimit = async (companyId, type) => {
  const license = await getActiveLicenseByCompany(companyId);

  if (type === "users" && typeof license.maxUsers === "number") {
    const currentUsers = await countCompanyUsers(companyId);
    if (currentUsers >= license.maxUsers) {
      throw {
        status: 403,
        message: `La limite de ${license.maxUsers} utilisateurs a été atteinte pour cette licence.`,
      };
    }
  }

  if (type === "employees" && typeof license.maxEmployees === "number") {
    const currentEmployees = await countCompanyEmployees(companyId);
    if (currentEmployees >= license.maxEmployees) {
      throw {
        status: 403,
        message: `La limite de ${license.maxEmployees} employés a été atteinte pour cette licence.`,
      };
    }
  }

  return true;
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