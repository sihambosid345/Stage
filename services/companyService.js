import { prisma } from "../prismaClient.js";
import { hashPassword } from "./authService.js";

export const createCompany = async (data) => {
  return await prisma.company.create({ data: sanitizeCompany(data) });
};

const sanitizeCompany = (company) => ({
  name:          company.name.trim(),
  legalName:     company.legalName     || null,
  taxIdentifier: company.taxIdentifier || null,
  rcNumber:      company.rcNumber      || null,
  iceNumber:     company.iceNumber     || null,
  cnssNumber:    company.cnssNumber    || null,
  email:         company.email         || null,
  phone:         company.phone         || null,
  address:       company.address       || null,
  city:          company.city          || null,
  country:       company.country       || "Maroc",
  timezone:      company.timezone      || "Africa/Casablanca",
  currency:      company.currency      || "MAD",
  medicalSector: company.medicalSector === true || company.medicalSector === "true",
  status:        company.status        || "ACTIVE",
});

const sanitizeLicense = (license) => ({
  planCode:      license.planCode,
  billingCycle:  license.billingCycle    || "MONTHLY",
  status:        license.status          || "ACTIVE",
  maxUsers:      license.maxUsers        ? Number(license.maxUsers)        : null,
  maxEmployees:  license.maxEmployees    ? Number(license.maxEmployees)    : null,
  maxStorageMb:  license.maxStorageMb    ? Number(license.maxStorageMb)    : null,
  startsAt:      new Date(license.startsAt),
  endsAt:        license.endsAt && license.endsAt !== "" ? new Date(license.endsAt) : null,
  payrollEnabled:  license.payrollEnabled  !== false  && license.payrollEnabled  !== "false",
  rhEnabled:       license.rhEnabled       !== false  && license.rhEnabled       !== "false",
  cnssEnabled:     license.cnssEnabled     === true   || license.cnssEnabled     === "true",
  taxEnabled:      license.taxEnabled      === true   || license.taxEnabled      === "true",
  damancomEnabled: license.damancomEnabled === true   || license.damancomEnabled === "true",
  notes:           license.notes           || null,
});

const sanitizeUser = async (user) => ({
  companyId: user.companyId,
  firstName: user.firstName,
  lastName:  user.lastName,
  fullName:  `${user.firstName} ${user.lastName}`,
  email:     user.email.toLowerCase().trim(),
  phone:     user.phone || null,
  passwordHash: await hashPassword(user.password),
  role:      user.role || "ADMIN",
  status:    user.status || "ACTIVE",
  permissions: user.permissions || [
    "dashboard", "employees", "organisation", "attendance",
    "contracts", "payroll", "reports", "users",
  ],
});

export const createCompanyWithLicenseAndUsers = async ({ company, license, users }) => {
  if (!company || !company.name || company.name.trim() === "") {
    const err = new Error("Les données de l'entreprise sont obligatoires (nom requis)");
    err.status = 400; throw err;
  }
  if (!license || !license.planCode || !license.startsAt) {
    const err = new Error("Les données de la licence sont obligatoires (planCode et startsAt requis)");
    err.status = 400; throw err;
  }
  if (!Array.isArray(users) || users.length === 0) {
    const err = new Error("Au moins un utilisateur doit être fourni");
    err.status = 400; throw err;
  }

  const seenEmails = new Set();
  for (const user of users) {
    if (!user.firstName || !user.lastName || !user.email || !user.password) {
      const err = new Error("Chaque utilisateur doit avoir firstName, lastName, email et password");
      err.status = 400; throw err;
    }
    const normalizedEmail = user.email.toLowerCase().trim();
    if (seenEmails.has(normalizedEmail)) {
      const err = new Error(`Adresse email dupliquée détectée: ${normalizedEmail}`);
      err.status = 400; throw err;
    }
    seenEmails.add(normalizedEmail);
  }

  const cleanedCompany = sanitizeCompany(company);
  const cleanedLicense = sanitizeLicense(license);

  const result = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({ data: cleanedCompany });

    const newLicense = await tx.license.create({
      data: { companyId: newCompany.id, ...cleanedLicense },
      include: { company: { select: { id: true, name: true } } },
    });

    const createdUsers = [];
    for (const user of users) {
      if (!user.firstName || !user.lastName || !user.email || !user.password) {
        const err = new Error("Chaque utilisateur doit avoir firstName, lastName, email et password");
        err.status = 400; throw err;
      }

      const createdUser = await tx.user.create({
        data: await sanitizeUser({ ...user, companyId: newCompany.id }),
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true,
          company: { select: { id: true, name: true } },
        },
      });
      createdUsers.push(createdUser);
    }

    return { company: newCompany, license: newLicense, users: createdUsers };
  });

  return result;
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