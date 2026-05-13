import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const sanitizeCompany = (company) => ({
  name:          company.name?.trim(),
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

const sanitizeLicense = (license, companyId) => ({
  companyId,
  planCode:        license.planCode,
  billingCycle:    license.billingCycle    || "MONTHLY",
  status:          license.status          || "ACTIVE",
  maxUsers:        license.maxUsers        ? Number(license.maxUsers)     : null,
  maxEmployees:    license.maxEmployees    ? Number(license.maxEmployees) : null,
  maxStorageMb:    license.maxStorageMb    ? Number(license.maxStorageMb) : null,
  startsAt:        new Date(license.startsAt),
  endsAt:          license.endsAt && license.endsAt !== "" ? new Date(license.endsAt) : null,
  payrollEnabled:  license.payrollEnabled  !== false && license.payrollEnabled  !== "false",
  rhEnabled:       license.rhEnabled       !== false && license.rhEnabled       !== "false",
  cnssEnabled:     license.cnssEnabled     === true  || license.cnssEnabled     === "true",
  taxEnabled:      license.taxEnabled      === true  || license.taxEnabled      === "true",
  damancomEnabled: license.damancomEnabled === true  || license.damancomEnabled === "true",
  notes:           license.notes           || null,
});

const DEFAULT_ADMIN_PERMISSIONS = [
  "dashboard", "employees", "organisation",
  "attendance", "contracts", "payroll", "reports", "users",
];

export const createCompany = async (data) => {
  return await prisma.company.create({
    data: sanitizeCompany(data),
    include: {
      _count: { select: { users: true, employees: true } },
    },
  });
};

export const getCompanies = async (companyId) => {
  const where = companyId ? { id: companyId } : {};
  return await prisma.company.findMany({
    where,
    include: {
      _count: {
        select: { users: true, employees: true, departments: true, positions: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, employees: true, departments: true, positions: true },
      },
    },
  });
  if (!company) throw { status: 404, message: "Entreprise non trouvée" };
  return company;
};

export const updateCompany = async (id, data) => {
  await getCompanyById(id);
  return await prisma.company.update({
    where: { id },
    data: sanitizeCompany(data),
    include: {
      _count: { select: { users: true, employees: true } },
    },
  });
};

export const deleteCompany = async (id) => {
  await getCompanyById(id);

  return await prisma.$transaction(async (tx) => {
    await tx.payslipContribution.deleteMany({ where: { payslip: { companyId: id } } });
    await tx.cnssReportLine.deleteMany({ where: { report: { companyId: id } } });
    
    const secondLevel = [
      'payslip', 'cnssReport', 'payrollItem', 'variableItem', 
      'attendanceRecord', 'employeeRecurringItem', 'employeeContract',
      'payrollRun', 'payrollPeriod', 'payrollConfig', 'auditLog',
      'statutoryRate', 'taxBracket'
    ];

    for (const model of secondLevel) {
      if (tx[model]) {
        await tx[model].deleteMany({ where: { companyId: id } });
      }
    }

    const coreLevel = ['employee', 'position', 'department', 'user', 'license'];
    for (const model of coreLevel) {
      if (tx[model]) {
        await tx[model].deleteMany({ where: { companyId: id } });
      }
    }

    return await tx.company.delete({ where: { id } });
  });
};

export const createCompanyWithLicenseAndUsers = async ({ company, license, users }) => {
  const emails = users.map((u) => u.email.toLowerCase().trim());
  const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (duplicateEmails.length > 0) {
    throw {
      status: 400,
      message: `Emails en doublon dans la requête : ${[...new Set(duplicateEmails)].join(", ")}`,
    };
  }

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  if (existingUsers.length > 0) {
    const taken = existingUsers.map((u) => u.email).join(", ");
    throw { status: 400, message: `Email(s) déjà utilisé(s) : ${taken}` };
  }

  return await prisma.$transaction(async (tx) => {
    const createdCompany = await tx.company.create({
      data: sanitizeCompany(company),
    });

    const createdLicense = await tx.license.create({
      data: sanitizeLicense(license, createdCompany.id),
    });

    const createdUsers = [];
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const created = await tx.user.create({
        data: {
          companyId:   createdCompany.id,
          firstName:   user.firstName.trim(),
          lastName:    user.lastName.trim(),
          fullName:    `${user.firstName.trim()} ${user.lastName.trim()}`,
          email:       user.email.toLowerCase().trim(),
          phone:       user.phone       || null,
          passwordHash,
          role:        user.role        || "ADMIN",
          status:      user.status      || "ACTIVE",
          permissions: user.permissions || DEFAULT_ADMIN_PERMISSIONS,
        },
        select: {
          id: true, email: true,
          firstName: true, lastName: true,
          role: true, status: true,
        },
      });
      createdUsers.push(created);
    }

    return { company: createdCompany, license: createdLicense, users: createdUsers };
  });
};