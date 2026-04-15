import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Créer un nouvel utilisateur super admin
 */
export const createSuperAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Vérifier si le super admin existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer le super admin
    const superAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        passwordHash,
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
        status: "ACTIVE",
        // companyId reste null pour les super admins
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isSuperAdmin: true,
      },
    });

    res.status(201).json({
      message: "Super admin created successfully",
      user: superAdmin,
    });
  } catch (error) {
    console.error("Create super admin error:", error);
    res.status(500).json({ error: "Failed to create super admin" });
  }
};

/**
 * Créer une nouvelle entreprise
 */
export const createCompany = async (req, res) => {
  try {
    const { name, legalName, taxIdentifier, email, phone, address, city } =
      req.body;

    // Vérifier que c'est un super admin
    if (!(req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN')) {
      return res.status(403).json({ error: "Only super admins can create companies" });
    }

    // Créer l'entreprise
    const company = await prisma.company.create({
      data: {
        name,
        legalName,
        taxIdentifier,
        email,
        phone,
        address,
        city,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
};

/**
 * Créer un admin pour une entreprise
 */
export const createCompanyAdmin = async (req, res) => {
  try {
    const { companyId, firstName, lastName, email, password, phone } = req.body;

    // Vérifier que c'est un super admin
    if (!(req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN')) {
      return res.status(403).json({ error: "Only super admins can create company admins" });
    }

    // Vérifier que l'entreprise existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'admin de l'entreprise
    const admin = await prisma.user.create({
      data: {
        companyId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        permissions: [
          "dashboard",
          "employees",
          "organisation",
          "attendance",
          "contracts",
          "payroll",
          "reports",
          "users"
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Company admin created successfully",
      user: admin,
    });
  } catch (error) {
    console.error("Create company admin error:", error);
    res.status(500).json({ error: "Failed to create company admin" });
  }
};

/**
 * Créer une licence pour une entreprise
 */
export const createLicense = async (req, res) => {
  try {
    const { companyId, planCode, billingCycle, maxUsers, maxEmployees, startsAt, endsAt } =
      req.body;

    // Vérifier que c'est un super admin
    if (!(req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN')) {
      return res.status(403).json({ error: "Only super admins can manage licenses" });
    }

    // Vérifier que l'entreprise existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Vérifier si une licence existe déjà
    const existingLicense = await prisma.license.findUnique({
      where: { companyId },
    });

    if (existingLicense) {
      // Mettre à jour la licence existante
      const updatedLicense = await prisma.license.update({
        where: { companyId },
        data: {
          planCode,
          billingCycle,
          maxUsers,
          maxEmployees,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          status: "ACTIVE",
        },
        select: {
          id: true,
          planCode: true,
          status: true,
          startsAt: true,
          endsAt: true,
          maxUsers: true,
          maxEmployees: true,
        },
      });

      return res.status(200).json({
        message: "License updated successfully",
        license: updatedLicense,
      });
    }

    // Créer une nouvelle licence
    const license = await prisma.license.create({
      data: {
        companyId,
        planCode,
        billingCycle,
        maxUsers,
        maxEmployees,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        planCode: true,
        status: true,
        startsAt: true,
        endsAt: true,
        maxUsers: true,
        maxEmployees: true,
      },
    });

    res.status(201).json({
      message: "License created successfully",
      license,
    });
  } catch (error) {
    console.error("Create license error:", error);
    res.status(500).json({ error: "Failed to create license" });
  }
};

/**
 * Obtenir toutes les entreprises (super admin uniquement)
 */
export const getAllCompanies = async (req, res) => {
  try {
    // Vérifier que c'est un super admin
    if (!(req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN')) {
      return res.status(403).json({ error: "Only super admins can view all companies" });
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        legalName: true,
        status: true,
        email: true,
        phone: true,
        createdAt: true,
        license: {
          select: {
            id: true,
            planCode: true,
            status: true,
            endsAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      total: companies.length,
      companies,
    });
  } catch (error) {
    console.error("Get all companies error:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};
