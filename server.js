import "dotenv/config";
import express    from "express";
import cors       from "cors";
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes       from "./routes/authRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import { authenticate, requireAdmin, requireSuperAdmin } from "./middlewares/authenticate.js";
import { licenseMiddleware } from "./middlewares/licenseMiddleware.js";

import * as companyCtrl    from "./controllers/companyController.js";
import * as userCtrl       from "./controllers/userController.js";
import * as departmentCtrl from "./controllers/departmentController.js";
import * as positionCtrl   from "./controllers/positionController.js";
import * as employeeCtrl   from "./controllers/employeeController.js";
import * as contractCtrl   from "./controllers/employeeContractController.js";
import * as attendanceCtrl from "./controllers/attendanceController.js";
import * as configCtrl     from "./controllers/payrollConfigController.js";
import * as periodCtrl     from "./controllers/payrollPeriodController.js";
import * as runCtrl        from "./controllers/payrollRunController.js";
import * as itemCtrl       from "./controllers/payrollItemController.js";
import * as payslipCtrl    from "./controllers/payslipController.js";
import * as variableCtrl   from "./controllers/variableItemController.js";
import * as recurringCtrl  from "./controllers/employeeRecurringItemController.js";
import * as licenseCtrl    from "./controllers/licenseController.js";
import { monthlyHoursFromWeekly, STANDARD_WEEKLY_HOURS } from "./utils/payrollHours.js";

const prisma = new PrismaClient();
console.log("JWT_SECRET =", process.env.JWT_SECRET);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:4200", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Public ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/super-admin", superAdminRoutes);

// ─── Protected ───────────────────────────────────────────────────────────────
const api = Router();
api.use(authenticate);
api.use(licenseMiddleware);

// ── Companies ────────────────────────────────────────────────────────────────
api.post  ("/companies",      requireSuperAdmin, companyCtrl.createCompany);
api.get   ("/companies/mine", companyCtrl.getMyCompany);
api.get   ("/companies",      requireSuperAdmin, companyCtrl.getCompanies);
api.get   ("/companies/:id",  companyCtrl.getCompany);
api.put   ("/companies/:id",  companyCtrl.updateCompany);
api.delete("/companies/:id",  requireSuperAdmin, companyCtrl.deleteCompany);

// ── Users ────────────────────────────────────────────────────────────────────
api.post  ("/users",     requireAdmin, userCtrl.createUser);
api.get   ("/users",     requireAdmin, userCtrl.getUsers);
api.get   ("/users/:id", requireAdmin, userCtrl.getUser);
api.put   ("/users/:id", requireAdmin, userCtrl.updateUser);
api.delete("/users/:id", requireAdmin, userCtrl.deleteUser);

// ── Departments ───────────────────────────────────────────────────────────────
api.post  ("/departments",                        departmentCtrl.createDepartment);
api.get   ("/departments",                        departmentCtrl.getDepartments);
api.get   ("/departments/company/:companyId",     departmentCtrl.getDepartmentsByCompany);
api.get   ("/departments/:id",                    departmentCtrl.getDepartment);
api.put   ("/departments/:id",                    departmentCtrl.updateDepartment);
api.delete("/departments/:id",                    departmentCtrl.deleteDepartment);

// ── Positions ─────────────────────────────────────────────────────────────────
api.post  ("/positions",                          positionCtrl.createPosition);
api.get   ("/positions",                          positionCtrl.getPositions);
api.get   ("/positions/department/:departmentId", positionCtrl.getPositionsByDepartment);
api.get   ("/positions/:id",                      positionCtrl.getPosition);
api.put   ("/positions/:id",                      positionCtrl.updatePosition);
api.delete("/positions/:id",                      positionCtrl.deletePosition);

// ── Employees ─────────────────────────────────────────────────────────────────
api.post  ("/employees",                          employeeCtrl.createEmployee);
api.get   ("/employees",                          employeeCtrl.getEmployees);
api.get   ("/employees/position/:positionId",     employeeCtrl.getEmployeesByPosition);
api.get   ("/employees/:id",                      employeeCtrl.getEmployee);
api.put   ("/employees/:id",                      employeeCtrl.updateEmployee);
api.delete("/employees/:id",                      employeeCtrl.deleteEmployee);

// ── Contracts ─────────────────────────────────────────────────────────────────
api.post  ("/contracts",                          contractCtrl.createContract);
api.get   ("/contracts",                          contractCtrl.getContracts);
api.get   ("/contracts/pdf/:filename",            contractCtrl.downloadContractPdf);
api.get   ("/contracts/employee/:employeeId",     contractCtrl.getContractsByEmployee);
api.get   ("/contracts/:id",                      contractCtrl.getContract);
api.post  ("/contracts/:id/generate-pdf",         contractCtrl.generateContractPdf);
api.put   ("/contracts/:id",                      contractCtrl.updateContract);
api.delete("/contracts/:id",                      contractCtrl.deleteContract);

// ── Attendance ────────────────────────────────────────────────────────────────
api.post  ("/attendances",                        attendanceCtrl.createAttendance);
api.get   ("/attendances",                        attendanceCtrl.getAttendances);
api.get   ("/attendances/employee/:employeeId",   attendanceCtrl.getAttendanceByEmployee);
api.get   ("/attendances/:id",                    attendanceCtrl.getAttendance);
api.put   ("/attendances/:id",                    attendanceCtrl.updateAttendance);
api.delete("/attendances/:id",                    attendanceCtrl.deleteAttendance);

// ── Variable Items ────────────────────────────────────────────────────────────
api.post  ("/variable-items",                     variableCtrl.createVariableItem);
api.get   ("/variable-items",                     variableCtrl.getVariableItems);
api.get   ("/variable-items/employee/:employeeId",variableCtrl.getVariableItemsByEmployee);
api.get   ("/variable-items/:id",                 variableCtrl.getVariableItem);
api.put   ("/variable-items/:id",                 variableCtrl.updateVariableItem);
api.delete("/variable-items/:id",                 variableCtrl.deleteVariableItem);

// ── Recurring Items ───────────────────────────────────────────────────────────
api.post  ("/recurring-items",                      recurringCtrl.createRecurringItem);
api.get   ("/recurring-items",                      recurringCtrl.getRecurringItems);
api.get   ("/recurring-items/employee/:employeeId", recurringCtrl.getRecurringItemsByEmployee);
api.get   ("/recurring-items/:id",                  recurringCtrl.getRecurringItem);
api.put   ("/recurring-items/:id",                  recurringCtrl.updateRecurringItem);
api.delete("/recurring-items/:id",                  recurringCtrl.deleteRecurringItem);

// ── Licenses ──────────────────────────────────────────────────────────────────
api.post  ("/licenses",                           requireSuperAdmin, licenseCtrl.createLicense);
api.get   ("/licenses",                           requireSuperAdmin, licenseCtrl.getLicenses);
api.get   ("/licenses/company/:companyId",        requireAdmin,      licenseCtrl.getLicenseByCompany);
api.get   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.getLicense);
api.put   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.updateLicense);
api.delete("/licenses/:id",                       requireSuperAdmin, licenseCtrl.deleteLicense);


// Payroll Periods
api.post  ("/payroll-periods",                  periodCtrl.createPeriod);
api.get   ("/payroll-periods",                  periodCtrl.getPeriods);
api.get   ("/payroll-periods/open/:companyId",  periodCtrl.getOpenPeriod);
api.get   ("/payroll-periods/:id",              periodCtrl.getPeriod);
api.put   ("/payroll-periods/:id",              periodCtrl.updatePeriod);
api.post  ("/payroll-periods/:id/close",        periodCtrl.closePeriod);
api.delete("/payroll-periods/:id",              periodCtrl.deletePeriod);

// Payroll Runs
api.post  ("/payroll-runs",                       runCtrl.createRun);
api.get   ("/payroll-runs",                       runCtrl.getRuns);
api.get   ("/payroll-runs/:id",                   runCtrl.getRun);
api.get   ("/payroll-runs/period/:periodId",      runCtrl.getRunsByPeriod);
api.put   ("/payroll-runs/:id",                   runCtrl.updateRun);
api.delete("/payroll-runs/:id",                   runCtrl.deleteRun);

// Payroll Items
api.post  ("/payroll-items",                      itemCtrl.createItem);
api.get   ("/payroll-items",                      itemCtrl.getItems);
api.get   ("/payroll-items/:id",                  itemCtrl.getItem);
api.get   ("/payroll-items/run/:runId",           itemCtrl.getItemsByRun);
api.get   ("/payroll-items/employee/:employeeId", itemCtrl.getItemsByEmployee);
api.put   ("/payroll-items/:id",                  itemCtrl.updateItem);
api.delete("/payroll-items/:id",                  itemCtrl.deleteItem);

// Payslips
api.post  ("/payslips",                           payslipCtrl.createPayslip);
api.get   ("/payslips",                           payslipCtrl.getPayslips);
api.get   ("/payslips/:id",                       payslipCtrl.getPayslip);
api.get   ("/payslips/employee/:employeeId",      payslipCtrl.getPayslipsByEmployee);
api.get   ("/payslips/period/:periodId",          payslipCtrl.getPayslipsByPeriod);
api.put   ("/payslips/:id",                       payslipCtrl.updatePayslip);
api.delete("/payslips/:id",                       payslipCtrl.deletePayslip);

// ══════════════════════════════════════════════════════════════════════════════
// PAYROLL CONFIG
// Ordre obligatoire : routes spécifiques AVANT /:id
// ══════════════════════════════════════════════════════════════════════════════

const getLicenseForCompany = async (companyId) => {
  if (!companyId) return null;
  return prisma.license.findUnique({
    where: { companyId },
    select: {
      id: true,
      payrollEnabled: true,
      cnssEnabled: true,
      taxEnabled: true,
      damancomEnabled: true,
      cimrEnabled: true,
      availableRegimes: true,
      status: true,
      endsAt: true,
    },
  });
};

const applyLicenseToPayrollConfig = (config, license) => {
  if (!config || !license) return config;
  // Modules doivent venir de la licence (source de vérité)
  const constrained = {
    ...config,
    cnssEnabled: !!license.cnssEnabled,
    irEnabled: !!license.taxEnabled,
    damancomEnabled: !!license.damancomEnabled,
    cimrEnabled: !!license.cimrEnabled,
  };
  // AMO suit CNSS par défaut (peut être ajusté plus tard)
  constrained.amoEnabled = !!license.cnssEnabled;

  // Régime doit être disponible selon la licence
  if (Array.isArray(license.availableRegimes) && license.availableRegimes.length > 0) {
    if (!license.availableRegimes.includes(constrained.regime)) {
      constrained.regime = license.availableRegimes[0];
    }
  }
  return constrained;
};

// ── 1. GET /all — Super Admin : toutes les configs ────────────────────────────
api.get("/payroll-config/all", requireSuperAdmin, async (req, res) => {
  try {
    console.log("GET /payroll-config/all");
    const configs = await prisma.payrollConfig.findMany({
      include: { company: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(configs);
  } catch (error) {
    console.error("Erreur GET /payroll-config/all:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── 2. POST /upsert — Admin : créer ou mettre à jour ─────────────────────────
api.post("/payroll-config/upsert", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("UPSERT /payroll-config - companyId:", companyId);

    // Super Admin n'a pas de companyId → erreur claire
    if (!companyId) {
      return res.status(400).json({
        error: "Super Admin ne peut pas faire un upsert sans companyId. Utilisez PUT /:id à la place."
      });
    }

    const license = await getLicenseForCompany(companyId);
    const incoming = { ...req.body };
    const constrained = applyLicenseToPayrollConfig(incoming, license);

    const config = await prisma.payrollConfig.upsert({
      where:  { companyId },
      update: {
        ...constrained,
        version: { increment: 1 },
        dateEffet: constrained.dateEffet ? new Date(constrained.dateEffet) : undefined,
      },
      create: {
        companyId,
        ...constrained,
        version: 1,
        createdById: req.user?.id,
        dateEffet: constrained.dateEffet ? new Date(constrained.dateEffet) : new Date(),
      },
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(applyLicenseToPayrollConfig(config, license));
  } catch (error) {
    console.error("Erreur UPSERT /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});

/// ── GET / — Config de l'entreprise connectée ───────────────────────────────
api.get("/payroll-config", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const isSuperAdmin = req.user.isSuperAdmin || false;
    
    console.log("GET /payroll-config - companyId:", companyId, "isSuperAdmin:", isSuperAdmin);

    // Si SUPER_ADMIN (pas de companyId), retourner TOUTES les configs
    if (isSuperAdmin || !companyId) {
      console.log("Super Admin - retourne toutes les configs");
      const configs = await prisma.payrollConfig.findMany({
        include: { company: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" }
      });
      return res.json(configs);
    }

    // Admin normal → config de son entreprise (créée si inexistante)
    const license = await getLicenseForCompany(companyId);
    let config = await prisma.payrollConfig.findUnique({
      where: { companyId },
      include: { company: { select: { id: true, name: true } } }
    });

    if (!config) {
      console.log("Config inexistante, création par défaut...");
      config = await prisma.payrollConfig.create({
        data: {
          companyId,
          regime:                  "MOROCCO_STANDARD",
          currency:                "MAD",
          weeklyHours:             STANDARD_WEEKLY_HOURS,
          monthlyHours:            monthlyHoursFromWeekly(STANDARD_WEEKLY_HOURS),
          workingDaysPerMonth:     26,
          cnssEnabled:             false,
          amoEnabled:              false,
          irEnabled:               false,
          cimrEnabled:             false,
          defaultCnssDeclaredDays: 26
        },
        include: { company: { select: { id: true, name: true } } }
      });
    }

    // Contrainte modules/régimes par licence
    const constrained = applyLicenseToPayrollConfig(config, license);
    // Cache en DB (best-effort) pour garder cohérence
    if (license) {
      await prisma.payrollConfig.update({
        where: { id: config.id },
        data: {
          cnssEnabled: constrained.cnssEnabled,
          amoEnabled: constrained.amoEnabled,
          irEnabled: constrained.irEnabled,
          damancomEnabled: constrained.damancomEnabled,
          cimrEnabled: constrained.cimrEnabled,
          regime: constrained.regime,
        },
      });
    }
    res.json(constrained);
  } catch (error) {
    console.error("Erreur GET /payroll-config:", error);
    res.status(500).json({ error: error.message });
  }
});



// ── 4. POST / — Créer une nouvelle config ─────────────────────────────────────
api.post("/payroll-config", requireAdmin, async (req, res) => {
  try {
    const { companyId, ...configData } = req.body;
    const userCompanyId = req.user.companyId;
    const isSuperAdmin = req.user.isSuperAdmin || false;
    
    console.log("POST /payroll-config - body:", req.body);
    console.log("userCompanyId:", userCompanyId);
    console.log("isSuperAdmin:", isSuperAdmin);
    
    let targetCompanyId = companyId;
    
    // Si c'est Super Admin, il DOIT fournir companyId dans le body
    if (isSuperAdmin) {
      if (!targetCompanyId) {
        return res.status(400).json({ 
          error: "companyId requis dans le body pour Super Admin" 
        });
      }
    } else {
      // Admin normal: utilise son propre companyId
      if (!userCompanyId) {
        return res.status(400).json({ 
          error: "Utilisateur non associé à une entreprise" 
        });
      }
      targetCompanyId = userCompanyId;
    }

    // Vérifier si une config existe déjà pour cette entreprise
    const existing = await prisma.payrollConfig.findUnique({
      where: { companyId: targetCompanyId }
    });

    if (existing) {
      return res.status(400).json({ 
        error: "Une configuration existe déjà pour cette entreprise. Utilisez PUT pour modifier." 
      });
    }

    const license = await getLicenseForCompany(targetCompanyId);
    const constrained = applyLicenseToPayrollConfig(configData, license);
    const config = await prisma.payrollConfig.create({
      data: { 
        companyId: targetCompanyId, 
        ...constrained,
        version: 1,
        createdById: req.user?.id,
        dateEffet: constrained.dateEffet ? new Date(constrained.dateEffet) : new Date(),
      },
      include: { company: { select: { id: true, name: true } } }
    });
    
    res.status(201).json(applyLicenseToPayrollConfig(config, license));
  } catch (error) {
    console.error("Erreur POST /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});
// ── 5. PUT / — Mettre à jour la config de l'entreprise connectée ──────────────
api.put("/payroll-config", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    console.log("PUT /payroll-config - companyId:", companyId);

    if (!companyId) {
      return res.status(400).json({ error: "Utilisez PUT /payroll-config/:id pour Super Admin" });
    }

    const existing = await prisma.payrollConfig.findUnique({ where: { companyId } });
    if (!existing) {
      return res.status(404).json({ error: "Configuration non trouvée" });
    }

    const license = await getLicenseForCompany(companyId);
    const constrained = applyLicenseToPayrollConfig(req.body, license);

    const config = await prisma.payrollConfig.update({
      where: { id: existing.id },
      data: {
        ...constrained,
        version: { increment: 1 },
        dateEffet: constrained.dateEffet ? new Date(constrained.dateEffet) : undefined,
      },
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(applyLicenseToPayrollConfig(config, license));
  } catch (error) {
    console.error("Erreur PUT /payroll-config:", error);
    res.status(400).json({ error: error.message });
  }
});

// ── 6. GET /:id — Config par ID (Super Admin) ─────────────────────────────────
api.get("/payroll-config/:id", requireSuperAdmin, async (req, res) => {
  try {
    console.log("GET /payroll-config/:id - id:", req.params.id);
    const config = await prisma.payrollConfig.findUnique({
      where: { id: req.params.id },
      include: { company: { select: { id: true, name: true } } }
    });
    if (!config) {
      return res.status(404).json({ error: "Configuration non trouvée" });
    }
    res.json(config);
  } catch (error) {
    console.error("Erreur GET /payroll-config/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── 7. PUT /:id — Modifier config par ID (Super Admin) ────────────────────────
api.put("/payroll-config/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("PUT /payroll-config/:id - id:", id);
    const existing = await prisma.payrollConfig.findUnique({ where: { id }, select: { companyId: true } });
    const license = existing?.companyId ? await getLicenseForCompany(existing.companyId) : null;
    const constrained = applyLicenseToPayrollConfig(req.body, license);
    const config = await prisma.payrollConfig.update({
      where: { id },
      data: {
        ...constrained,
        version: { increment: 1 },
        dateEffet: constrained.dateEffet ? new Date(constrained.dateEffet) : undefined,
      },
      include: { company: { select: { id: true, name: true } } }
    });
    res.json(applyLicenseToPayrollConfig(config, license));
  } catch (error) {
    console.error("Erreur PUT /payroll-config/:id:", error);
    res.status(400).json({ error: error.message });
  }
});

// ── 8. DELETE /:id — Supprimer config (Super Admin) ───────────────────────────
api.delete("/payroll-config/:id", requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("DELETE /payroll-config/:id - id:", id);
    await prisma.payrollConfig.delete({ where: { id } });
    res.json({ message: "Configuration supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /payroll-config/:id:", error);
    res.status(400).json({ error: error.message });
  }
});

// ─── Mount API ────────────────────────────────────────────────────────────────
app.use(api);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route introuvable." }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur interne." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));




export default app;