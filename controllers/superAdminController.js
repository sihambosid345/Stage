import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ── GET /super-admin/companies ─────────────────────────────────────────────
export const getAllCompanies = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can view all companies" });
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        legalName: true,
        taxIdentifier: true,
        rcNumber: true,
        iceNumber: true,
        cnssNumber: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        timezone: true,
        currency: true,
        status: true,
        createdAt: true,
        license: {
          select: {
            id: true,
            planCode: true,
            status: true,
            billingCycle: true,
            startsAt: true,
            endsAt: true,
            maxUsers: true,
            maxEmployees: true,
            maxStorageMb: true,
            payrollEnabled: true,
            rhEnabled: true,
            cnssEnabled: true,
            taxEnabled: true,
            damancomEnabled: true,
            notes: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ total: companies.length, companies });
  } catch (error) {
    console.error("Get all companies error:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

// ── GET /super-admin/companies/:id/users ──────────────────────────────────
export const getCompanyUsers = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { companyId } = req.params;

    const users = await prisma.user.findMany({
      where: { companyId, isSuperAdmin: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ total: users.length, users });
  } catch (error) {
    console.error("Get company users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ── POST /super-admin/companies ────────────────────────────────────────────
export const createCompany = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can create companies" });
    }

    const { name, legalName, taxIdentifier, rcNumber, iceNumber, cnssNumber,
            email, phone, address, city, country, timezone, currency } = req.body;

    const company = await prisma.company.create({
      data: {
        name, legalName, taxIdentifier, rcNumber, iceNumber, cnssNumber,
        email, phone, address, city,
        country:  country  || "Maroc",
        timezone: timezone || "Africa/Casablanca",
        currency: currency || "MAD",
        status: "ACTIVE",
      },
    });

    // Créer automatiquement une licence TRIAL de 30 jours
    const startsAt = new Date();
    const endsAt   = new Date();
    endsAt.setDate(endsAt.getDate() + 30);

    const license = await prisma.license.create({
      data: {
        companyId:   company.id,
        planCode:    "BASIC",
        status:      "TRIAL",
        billingCycle: "MONTHLY",
        startsAt,
        endsAt,
        maxUsers:        5,
        maxEmployees:    20,
        payrollEnabled:  true,
        rhEnabled:       true,
      },
    });

    res.status(201).json({ message: "Company created successfully", company, license });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
};

// ── POST /super-admin/licenses ─────────────────────────────────────────────
export const createOrUpdateLicense = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can manage licenses" });
    }

    const {
      companyId, planCode, billingCycle, status,
      maxUsers, maxEmployees, maxStorageMb,
      startsAt, endsAt,
      payrollEnabled, rhEnabled, cnssEnabled, taxEnabled, damancomEnabled, notes,
    } = req.body;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const data = {
      planCode,
      billingCycle: billingCycle || "MONTHLY",
      status:       status       || "ACTIVE",
      startsAt:     new Date(startsAt),
      endsAt:       endsAt ? new Date(endsAt) : null,
      maxUsers:        maxUsers        ? Number(maxUsers)        : null,
      maxEmployees:    maxEmployees    ? Number(maxEmployees)    : null,
      maxStorageMb:    maxStorageMb    ? Number(maxStorageMb)    : null,
      payrollEnabled:  payrollEnabled  ?? true,
      rhEnabled:       rhEnabled       ?? true,
      cnssEnabled:     cnssEnabled     ?? false,
      taxEnabled:      taxEnabled      ?? false,
      damancomEnabled: damancomEnabled ?? false,
      notes:           notes           || null,
    };

    const existing = await prisma.license.findUnique({ where: { companyId } });

    if (existing) {
      const updated = await prisma.license.update({
        where: { companyId },
        data,
        select: { id: true, planCode: true, status: true, startsAt: true, endsAt: true },
      });
      return res.json({ message: "Licence mise à jour avec succès.", license: updated });
    }

    const created = await prisma.license.create({
      data: { companyId, ...data },
      select: { id: true, planCode: true, status: true, startsAt: true, endsAt: true },
    });
    res.status(201).json({ message: "Licence créée avec succès.", license: created });
  } catch (error) {
    console.error("Create/update license error:", error);
    res.status(500).json({ error: "Failed to manage license" });
  }
};

// ── POST /super-admin/company-admins ──────────────────────────────────────
export const createCompanyAdmin = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can create company admins" });
    }

    const { companyId, firstName, lastName, email, password, phone } = req.body;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        companyId, firstName, lastName,
        fullName: `${firstName} ${lastName}`,
        email, phone, passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        permissions: ["dashboard","employees","organisation","attendance","contracts","payroll","reports","users"],
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, status: true,
        company: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ message: "Company admin created successfully", user: admin });
  } catch (error) {
    console.error("Create company admin error:", error);
    res.status(500).json({ error: "Failed to create company admin" });
  }
};

// ── POST /super-admin/admins ───────────────────────────────────────────────
export const createSuperAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = await prisma.user.create({
      data: {
        firstName, lastName, fullName: `${firstName} ${lastName}`,
        email, phone, passwordHash,
        role: "SUPER_ADMIN", isSuperAdmin: true, status: "ACTIVE",
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, isSuperAdmin: true },
    });
    res.status(201).json({ message: "Super admin created successfully", user: superAdmin });
  } catch (error) {
    console.error("Create super admin error:", error);
    res.status(500).json({ error: "Failed to create super admin" });
  }
};