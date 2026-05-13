import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import * as companyService from "../services/companyService.js";

// ─────────────────────────────────────────────
// Helper : propagation d'erreur HTTP
// ─────────────────────────────────────────────
const handleError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  const status  = error?.status  || 500;
  const message = error?.message || fallbackMessage;
  res.status(status).json({ error: message });
};

// ─────────────────────────────────────────────
// Créer un super admin
// ─────────────────────────────────────────────
export const createSuperAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const superAdmin = await prisma.user.create({
      data: {
        firstName, lastName,
        fullName: `${firstName} ${lastName}`,
        email, phone, passwordHash,
        role: "SUPER_ADMIN", isSuperAdmin: true, status: "ACTIVE",
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, isSuperAdmin: true,
      },
    });

    res.status(201).json({ message: "Super admin created successfully", user: superAdmin });
  } catch (error) {
    handleError(res, error, "Failed to create super admin");
  }
};

// ─────────────────────────────────────────────
// Créer une entreprise seule
// ─────────────────────────────────────────────
export const createCompany = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can create companies" });
    }

    const {
      name, legalName, taxIdentifier, rcNumber, iceNumber, cnssNumber,
      email, phone, address, city, country, timezone, currency,
      medicalSector, status,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Le nom de l'entreprise est obligatoire." });
    }

    const company = await companyService.createCompany({
      name, legalName, taxIdentifier, rcNumber, iceNumber, cnssNumber,
      email, phone, address, city, country, timezone, currency,
      medicalSector, status,
    });

    res.status(201).json({ message: "Company created successfully", company });
  } catch (error) {
    handleError(res, error, "Failed to create company");
  }
};

// ─────────────────────────────────────────────
// Créer un admin pour une entreprise
// ─────────────────────────────────────────────
export const createCompanyAdmin = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can create company admins" });
    }

    const { companyId, firstName, lastName, email, password, phone } = req.body;

    if (!companyId || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        companyId, firstName, lastName,
        fullName: `${firstName} ${lastName}`,
        email, phone, passwordHash,
        role: "ADMIN", status: "ACTIVE",
        permissions: [
          "dashboard", "employees", "organisation", "attendance",
          "contracts", "payroll", "reports", "users",
        ],
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true,
        company: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ message: "Company admin created successfully", user: admin });
  } catch (error) {
    handleError(res, error, "Failed to create company admin");
  }
};

// ─────────────────────────────────────────────
// Créer OU mettre à jour une licence (1 seule par company)
// ─────────────────────────────────────────────
export const createOrUpdateLicense = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can manage licenses" });
    }

    const {
      companyId, planCode, billingCycle, status,
      maxUsers, maxEmployees, maxStorageMb,
      startsAt, endsAt,
      payrollEnabled, rhEnabled, cnssEnabled, taxEnabled, damancomEnabled,
      notes,
    } = req.body;

    if (!companyId || !planCode || !startsAt) {
      return res.status(400).json({ error: "companyId, planCode et startsAt sont obligatoires." });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const licenseData = {
      planCode,
      billingCycle:    billingCycle    || "MONTHLY",
      status:          status          || "ACTIVE",
      maxUsers:        maxUsers        ? Number(maxUsers)     : null,
      maxEmployees:    maxEmployees    ? Number(maxEmployees) : null,
      maxStorageMb:    maxStorageMb    ? Number(maxStorageMb) : null,
      startsAt:        new Date(startsAt),
      endsAt:          endsAt && endsAt !== "" ? new Date(endsAt) : null,
      payrollEnabled:  payrollEnabled  !== false && payrollEnabled  !== "false",
      rhEnabled:       rhEnabled       !== false && rhEnabled       !== "false",
      cnssEnabled:     cnssEnabled     === true  || cnssEnabled     === "true",
      taxEnabled:      taxEnabled      === true  || taxEnabled      === "true",
      damancomEnabled: damancomEnabled === true  || damancomEnabled === "true",
      notes:           notes || null,
    };

    // ✅ Check — wahed licence ghir l had company
    const existing = await prisma.license.findUnique({ where: { companyId } });

    if (existing) {
      // ❌ BLOC — ma kaydirich update, katla3 error clear
      return res.status(409).json({
        error: `L'entreprise "${company.name}" possède déjà une licence active. Utilisez le bouton Modifier pour la mettre à jour.`
      });
    }

    // ✅ Créer seulement si aucune licence n'existe
    const license = await prisma.license.create({
      data: { companyId, ...licenseData },
      include: { company: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: "Licence créée avec succès", license });

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Cette entreprise possède déjà une licence. Utilisez Modifier pour la mettre à jour."
      });
    }
    handleError(res, error, "Failed to manage license");
  }
};
// ─────────────────────────────────────────────
// Toutes les entreprises
// ─────────────────────────────────────────────
export const getAllCompanies = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can view all companies" });
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true, name: true, legalName: true, taxIdentifier: true,
        rcNumber: true, iceNumber: true, cnssNumber: true,
        email: true, phone: true, address: true, city: true,
        country: true, timezone: true, currency: true,
        medicalSector: true, status: true, createdAt: true,
        license: {
          select: {
            id: true, planCode: true, status: true, billingCycle: true,
            startsAt: true, endsAt: true, maxUsers: true, maxEmployees: true,
          },
        },
        _count: { select: { users: true, employees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ total: companies.length, companies });
  } catch (error) {
    handleError(res, error, "Failed to fetch companies");
  }
};

// ─────────────────────────────────────────────
// Utilisateurs d'une entreprise
// ─────────────────────────────────────────────
export const getCompanyUsers = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can view company users" });
    }

    const { companyId } = req.params;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const users = await prisma.user.findMany({
      where: { companyId, isSuperAdmin: false },
      select: {
        id: true, firstName: true, lastName: true, fullName: true,
        email: true, phone: true, role: true, permissions: true,
        status: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ company: { id: company.id, name: company.name }, total: users.length, users });
  } catch (error) {
    handleError(res, error, "Failed to fetch company users");
  }
};

// ─────────────────────────────────────────────
// Stats du dashboard super admin
// ─────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Access denied" });
    }

    const now = new Date();

    const [
      totalCompanies, activeCompanies,
      totalUsers,
      totalLicenses, activeLicenses, trialLicenses, expiredLicenses,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { isSuperAdmin: false } }),
      prisma.license.count(),
      prisma.license.count({ where: { status: "ACTIVE" } }),
      prisma.license.count({ where: { status: "TRIAL" } }),
      prisma.license.count({
        where: { OR: [{ status: "EXPIRED" }, { endsAt: { lt: now } }] },
      }),
    ]);

    res.json({
      companies: { total: totalCompanies, active: activeCompanies, inactive: totalCompanies - activeCompanies },
      users:     { total: totalUsers },
      licenses:  { total: totalLicenses, active: activeLicenses, trial: trialLicenses, expired: expiredLicenses },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch dashboard stats");
  }
};

// ─────────────────────────────────────────────
// Créer entreprise + licence + utilisateurs (atomique)
// ─────────────────────────────────────────────
export const createCompanyWithLicenseAndUsers = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can create companies" });
    }

    const { company, license, users } = req.body;

    // ── Validation ──────────────────────────────
    if (!company || !company.name || company.name.trim() === "") {
      return res.status(400).json({ error: "Les données de l'entreprise sont obligatoires (nom requis)" });
    }
    if (!license || !license.planCode || !license.startsAt) {
      return res.status(400).json({ error: "Les données de la licence sont obligatoires (planCode et startsAt requis)" });
    }
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "Au moins un utilisateur doit être fourni" });
    }
    for (const user of users) {
      if (!user.firstName || !user.lastName || !user.email || !user.password) {
        return res.status(400).json({
          error: "Chaque utilisateur doit avoir firstName, lastName, email et password",
        });
      }
    }

    // ── Appel service ────────────────────────────
    const result = await companyService.createCompanyWithLicenseAndUsers({ company, license, users });

    res.status(201).json({
      message: "Entreprise, licence et utilisateurs créés avec succès",
      data: result,
    });
  } catch (error) {
    // Propage le status HTTP réel (400, 404, 500…) depuis le service
    handleError(res, error, "Échec de la création de l'entreprise avec licence et utilisateurs");
  }
};

// ─────────────────────────────────────────────
// Générer un contrat HTML/PDF
// ─────────────────────────────────────────────
export const generateContract = async (req, res) => {
  try {
    if (!(req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN")) {
      return res.status(403).json({ error: "Only super admins can generate contracts" });
    }

    const {
      companyName, legalName, address, city, country,
      taxIdentifier, rcNumber, iceNumber, cnssNumber,
      email, phone, license, users, generatedAt,
    } = req.body;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contrat de Service - ${companyName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #4f46e5; margin: 0; }
        .section { margin: 25px 0; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .info-item { padding: 10px; background: #f9fafb; border-radius: 5px; }
        .info-item strong { color: #374151; display: block; margin-bottom: 5px; }
        .users-list { margin: 15px 0; }
        .user-item { padding: 10px; margin: 8px 0; background: #f3f4f6; border-radius: 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
        .badge { display: inline-block; padding: 4px 8px; background: #4f46e5; color: white; border-radius: 12px; font-size: 12px; margin: 2px; }
        .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 5px; cursor: pointer; }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">🖨️ Imprimer en PDF</button>
      <div class="header">
        <h1>CONTRAT DE SERVICE</h1>
        <h2>${companyName}</h2>
        <p>Date: ${new Date(generatedAt).toLocaleDateString("fr-FR")}</p>
      </div>

      <div class="section">
        <h2>Informations de l'entreprise</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Nom commercial:</strong> ${companyName}</div>
          <div class="info-item"><strong>Raison sociale:</strong> ${legalName || "N/A"}</div>
          <div class="info-item"><strong>Adresse:</strong> ${address || "N/A"}</div>
          <div class="info-item"><strong>Ville:</strong> ${city || "N/A"}</div>
          <div class="info-item"><strong>Pays:</strong> ${country || "Maroc"}</div>
          <div class="info-item"><strong>Email:</strong> ${email || "N/A"}</div>
          <div class="info-item"><strong>Téléphone:</strong> ${phone || "N/A"}</div>
          <div class="info-item"><strong>Identifiant fiscal:</strong> ${taxIdentifier || "N/A"}</div>
          <div class="info-item"><strong>Numéro RC:</strong> ${rcNumber || "N/A"}</div>
          <div class="info-item"><strong>Numéro ICE:</strong> ${iceNumber || "N/A"}</div>
          <div class="info-item"><strong>Numéro CNSS:</strong> ${cnssNumber || "N/A"}</div>
        </div>
      </div>

      <div class="section">
        <h2>Détails de la licence</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Plan:</strong> ${license?.planCode || "N/A"}</div>
          <div class="info-item"><strong>Statut:</strong> <span class="badge">${license?.status || "N/A"}</span></div>
          <div class="info-item"><strong>Cycle de facturation:</strong> ${license?.billingCycle || "N/A"}</div>
          <div class="info-item"><strong>Date de début:</strong> ${license?.startsAt ? new Date(license.startsAt).toLocaleDateString("fr-FR") : "N/A"}</div>
          <div class="info-item"><strong>Date de fin:</strong> ${license?.endsAt ? new Date(license.endsAt).toLocaleDateString("fr-FR") : "Illimité"}</div>
          <div class="info-item"><strong>Max utilisateurs:</strong> ${license?.maxUsers || "Illimité"}</div>
          <div class="info-item"><strong>Max employés:</strong> ${license?.maxEmployees || "Illimité"}</div>
          <div class="info-item"><strong>Max stockage:</strong> ${license?.maxStorageMb ? license.maxStorageMb + " Mo" : "Illimité"}</div>
        </div>
        <h3>Fonctionnalités activées:</h3>
        <div>
          ${license?.payrollEnabled  ? '<span class="badge">Paie</span>'     : ""}
          ${license?.rhEnabled       ? '<span class="badge">RH</span>'       : ""}
          ${license?.cnssEnabled     ? '<span class="badge">CNSS</span>'     : ""}
          ${license?.taxEnabled      ? '<span class="badge">Fiscal</span>'   : ""}
          ${license?.damancomEnabled ? '<span class="badge">Damancom</span>' : ""}
        </div>
      </div>

      <div class="section">
        <h2>Utilisateurs autorisés (${users?.length || 0})</h2>
        <div class="users-list">
          ${users?.map((user) => `
            <div class="user-item">
              <strong>${user.firstName} ${user.lastName}</strong> - ${user.email}<br>
              Rôle: <span class="badge">${user.role}</span> | Statut: <span class="badge">${user.status}</span>
            </div>
          `).join("") || "<p>Aucun utilisateur</p>"}
        </div>
      </div>

      <div class="section">
        <h2>Termes et conditions</h2>
        <p>Ce contrat de service régit les conditions d'utilisation de la plateforme de gestion RH pour l'entreprise ${companyName}.</p>
        <ul>
          <li>La licence est valable selon les termes spécifiés dans la section "Détails de la licence"</li>
          <li>L'entreprise s'engage à respecter les limites d'utilisateurs et d'employés spécifiées</li>
          <li>Les fonctionnalités sont disponibles selon les options activées dans la licence</li>
          <li>Toute utilisation au-delà des limites prévues nécessitera une mise à niveau de la licence</li>
          <li>Le service est fourni "tel quel" sans garantie explicite ou implicite</li>
        </ul>
      </div>

      <div class="footer">
        <p>Ce contrat a été généré automatiquement le ${new Date(generatedAt).toLocaleDateString("fr-FR")} à ${new Date(generatedAt).toLocaleTimeString("fr-FR")}</p>
        <p>Pour toute question, contactez votre administrateur système.</p>
      </div>
    </body>
    </html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    handleError(res, error, "Failed to generate contract");
  }
};