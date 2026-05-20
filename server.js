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
import payrollCalculationRoutes from './routes/payrollCalculationRoutes.js';
import auditLogRoutes from "./routes/auditLogRoutes.js";

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

app.use('/api/payroll-calculation', payrollCalculationRoutes);

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
// companyCtrl.getCompanies filtre déjà par companyId si pas superAdmin
api.get   ("/companies",      requireAdmin, companyCtrl.getCompanies);
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
api.get   ("/licenses", requireAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN';
    if (isSuperAdmin) {
      // Super Admin : toutes les licences
      const licenses = await prisma.license.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json(licenses);
    } else {
      // Admin : seulement la licence de sa propre entreprise (retournée sous forme de tableau)
      const license = await prisma.license.findUnique({ where: { companyId: req.user.companyId } });
      return res.json(license ? [license] : []);
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});
api.get   ("/licenses/company/:companyId",        requireAdmin,      licenseCtrl.getLicenseByCompany);
api.get   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.getLicense);
api.put   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.updateLicense);
api.delete("/licenses/:id",                       requireSuperAdmin, licenseCtrl.deleteLicense);

// Audit logs
api.use('/audit-logs', auditLogRoutes);


// Payroll Periods
api.post  ("/payroll-periods",                  periodCtrl.createPeriod);
api.get   ("/payroll-periods",                  periodCtrl.getPeriods);
api.get   ("/payroll-periods/open/:companyId",  periodCtrl.getOpenPeriod);
api.get   ("/payroll-periods/:id",              periodCtrl.getPeriod);
api.put   ("/payroll-periods/:id",              periodCtrl.updatePeriod);
api.post  ("/payroll-periods/:id/close",        periodCtrl.closePeriod);
api.delete("/payroll-periods/:id",              periodCtrl.deletePeriod);

// Runs
api.get   ("/payroll/runs",                          runCtrl.getRuns);
api.post  ("/payroll/runs",                          runCtrl.createRun);
api.get   ("/payroll/runs/:id",                      runCtrl.getRun);
api.put   ("/payroll/runs/:id",                      runCtrl.updateRun);
api.patch ("/payroll/runs/:id",                      runCtrl.updateRun);
api.delete("/payroll/runs/:id",                      runCtrl.deleteRun);

// Payslips nested under runs
api.get("/payroll/runs/:runId/payslips", async (req, res) => {
  try {
    const { runId } = req.params;
    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId: runId },
      include: { employee: { select: { firstName: true, lastName: true, matricule: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(payslips);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.get("/payroll/payslips/run/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId: runId },
      include: { employee: { select: { firstName: true, lastName: true, matricule: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(payslips);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.get("/payroll/payslips", async (req, res) => {
  try {
    const payslips = await prisma.payslip.findMany({
      include: { employee: { select: { firstName: true, lastName: true, matricule: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(payslips);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.get("/payroll/payslips/:payslipId", async (req, res) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.payslipId },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true,
            matricule: true, employeeCode: true,
            cin: true, email: true, phone: true,
            address: true, city: true,
            paymentMode: true, bankName: true, bankAccountNumber: true,
            maritalStatus: true, childrenCount: true,
            position: true,
            department: { select: { name: true } },
            contracts: {
              where: { status: "ACTIVE" },
              orderBy: { startDate: "desc" },
              take: 1,
              select: { contractType: true, salaryCalculationType: true, startDate: true, endDate: true },
            },
          }
        },
        payrollPeriod: { select: { year: true, month: true, type: true, status: true } },
        contributions: true,
      },
    });
    if (!payslip) return res.status(404).json({ error: "Bulletin introuvable" });

    const payrollItems = await prisma.payrollItem.findMany({
      where: {
        payrollRunId: payslip.payrollRunId,
        employeeId: payslip.employeeId,
      },
      orderBy: { sortOrder: "asc" },
    });

    const MONTHS_FR = ["","Janvier","Février","Mars","Avril","Mai","Juin",
      "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const per = payslip.payrollPeriod;
    const emp = payslip.employee;

    const normalized = {
      ...payslip,
      items: payrollItems || [],
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "—",
      matricule: emp?.matricule || emp?.employeeCode || "—",
      employeeCode: emp?.employeeCode || "—",
      employeeCin: emp?.cin || "—",
      employeeEmail: emp?.email || "—",
      employeePhone: emp?.phone || "—",
      employeeAddress: emp?.address || "—",
      employeeCity: emp?.city || "—",
      employeePaymentMode: emp?.paymentMode || "—",
      employeeBankName: emp?.bankName || "—",
      employeeBankAccountNumber: emp?.bankAccountNumber || "—",
      employeeMaritalStatus: emp?.maritalStatus || "—",
      employeeChildrenCount: emp?.childrenCount ?? 0,
      employeePosition: emp?.position?.title || emp?.position?.name || "—",
      employeeDepartment: emp?.department?.name || "—",
      period: per ? `${MONTHS_FR[per.month] ?? per.month} ${per.year}` : "—",
      payrollPeriodType: per?.type || "—",
      payrollPeriodStatus: per?.status || "—",
      salaryType: emp?.contracts?.[0]?.salaryCalculationType || "MONTHLY",
      contractType: emp?.contracts?.[0]?.contractType || "—",
      contractStartDate: emp?.contracts?.[0]?.startDate,
      contractEndDate: emp?.contracts?.[0]?.endDate,
      grossSalary: Number(payslip.grossSalary ?? 0),
      netSalary: Number(payslip.netSalary ?? 0),
      taxableGross: Number(payslip.taxableGross ?? 0),
      cnssBase: Number(payslip.cnssBase ?? 0),
      amoBase: Number(payslip.amoBase ?? 0),
      amoGross: Number(payslip.amoBase ?? 0),
      totalAllowances: Number(payslip.totalAllowances ?? 0),
      totalBonuses: Number(payslip.totalBonuses ?? 0),
      totalTax: Number(payslip.totalTax ?? 0),
      totalCnss: Number(payslip.totalCnss ?? 0),
      declaredDays: Number(payslip.declaredDays ?? 0),
      totalEmpCharges: Number(payslip.employeeChargesTotal ?? 0),
      cnssEmpAmount: Number(payslip.totalCnss ?? 0),
      amoEmpAmount: 0,
      cimrEmpAmount: 0,
      incomeTaxBase: Number(payslip.incomeTaxBase ?? 0),
      incomeTaxAmount: Number(payslip.incomeTaxAmount ?? 0),
      employerChargesTotal: Number(payslip.employerChargesTotal ?? 0),
      totalDeductions: Number(payslip.totalDeductions ?? 0),
      currency: payslip.currency || "MAD",
    };

    const snap = payslip.snapshotData || {};
    const rates = snap.appliedRates || {};
    if (rates.amoEmployee) {
      normalized.amoEmpAmount = Math.round(Number(normalized.amoGross) * rates.amoEmployee * 100) / 100;
    }
    if (rates.cimrEmployee) {
      normalized.cimrEmpAmount = Math.round(Number(normalized.grossSalary) * rates.cimrEmployee * 100) / 100;
    }
    normalized.baseSalary = snap.baseSalary !== undefined ? Number(snap.baseSalary) : Number(normalized.grossSalary);

    res.json(normalized);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.get("/payroll/payslips/:payslipId/pdf", async (req, res) => {
  try {
    const { generatePayslipPdf } = await import("./services/payslipPdfService.js");
    const result = await generatePayslipPdf(req.params.payslipId);
    return res.download(result.filepath, result.filename);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

api.get("/payroll/runs/:runId/payslips/:payslipId", async (req, res) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.payslipId },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true,
            matricule: true, employeeCode: true,
            cin: true, email: true, phone: true,
            address: true, city: true,
            paymentMode: true, bankName: true, bankAccountNumber: true,
            maritalStatus: true, childrenCount: true,
            position: true,
            department: { select: { name: true } },
            contracts: {
              where: { status: "ACTIVE" },
              orderBy: { startDate: "desc" },
              take: 1,
              select: { contractType: true, salaryCalculationType: true, startDate: true, endDate: true },
            },
          }
        },
        payrollPeriod: { select: { year: true, month: true, type: true, status: true } },
        contributions: true,
      },
    });
    if (!payslip) return res.status(404).json({ error: "Bulletin introuvable" });

    const payrollItems = await prisma.payrollItem.findMany({
      where: {
        payrollRunId: payslip.payrollRunId,
        employeeId: payslip.employeeId,
      },
      orderBy: { sortOrder: "asc" },
    });

    // Normalize for frontend: add aliases expected by Angular component
    const MONTHS_FR = ["","Janvier","Février","Mars","Avril","Mai","Juin",
      "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const per = payslip.payrollPeriod;
    const emp = payslip.employee;

    const normalized = {
      ...payslip,
      // Frontend reads "items" not "payrollItems"
      items: payrollItems || [],
      // Frontend reads "employeeName"
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "—",
      matricule: emp?.matricule || emp?.employeeCode || "—",
      employeeCode: emp?.employeeCode || "—",
      employeeCin: emp?.cin || "—",
      employeeEmail: emp?.email || "—",
      employeePhone: emp?.phone || "—",
      employeeAddress: emp?.address || "—",
      employeeCity: emp?.city || "—",
      employeePaymentMode: emp?.paymentMode || "—",
      employeeBankName: emp?.bankName || "—",
      employeeBankAccountNumber: emp?.bankAccountNumber || "—",
      employeeMaritalStatus: emp?.maritalStatus || "—",
      employeeChildrenCount: emp?.childrenCount ?? 0,
      employeePosition: emp?.position?.title || emp?.position?.name || "—",
      employeeDepartment: emp?.department?.name || "—",
      // Period as string
      period: per ? `${MONTHS_FR[per.month] ?? per.month} ${per.year}` : "—",
      payrollPeriodType: per?.type || "—",
      payrollPeriodStatus: per?.status || "—",
      salaryType: emp?.contracts?.[0]?.salaryCalculationType || "MONTHLY",
      contractType: emp?.contracts?.[0]?.contractType || "—",
      contractStartDate: emp?.contracts?.[0]?.startDate,
      contractEndDate: emp?.contracts?.[0]?.endDate,
      // Ensure numeric fields
      grossSalary: Number(payslip.grossSalary ?? 0),
      netSalary: Number(payslip.netSalary ?? 0),
      taxableGross: Number(payslip.taxableGross ?? 0),
      cnssBase: Number(payslip.cnssBase ?? 0),
      amoBase: Number(payslip.amoBase ?? 0),
      amoGross: Number(payslip.amoBase ?? 0),
      totalAllowances: Number(payslip.totalAllowances ?? 0),
      totalBonuses: Number(payslip.totalBonuses ?? 0),
      totalTax: Number(payslip.totalTax ?? 0),
      totalCnss: Number(payslip.totalCnss ?? 0),
      declaredDays: Number(payslip.declaredDays ?? 0),
      totalEmpCharges: Number(payslip.employeeChargesTotal ?? 0),
      cnssEmpAmount: Number(payslip.totalCnss ?? 0),
      amoEmpAmount: 0,
      cimrEmpAmount: 0,
      incomeTaxBase: Number(payslip.incomeTaxBase ?? 0),
      incomeTaxAmount: Number(payslip.incomeTaxAmount ?? 0),
      employerChargesTotal: Number(payslip.employerChargesTotal ?? 0),
      totalDeductions: Number(payslip.totalDeductions ?? 0),
      currency: payslip.currency || "MAD",
    };

    // Calculate AMO/CIMR from snapshot
    const snap = payslip.snapshotData || {};
    const rates = snap.appliedRates || {};
    if (rates.amoEmployee) {
      normalized.amoEmpAmount = Math.round(Number(normalized.amoGross) * rates.amoEmployee * 100) / 100;
    }
    if (rates.cimrEmployee) {
      normalized.cimrEmpAmount = Math.round(Number(normalized.grossSalary) * rates.cimrEmployee * 100) / 100;
    }
    normalized.baseSalary = snap.baseSalary !== undefined ? Number(snap.baseSalary) : Number(normalized.grossSalary);

    res.json(normalized);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.get("/payroll/runs/:runId/payslips/:payslipId/pdf", async (req, res) => {
  try {
    const { generatePayslipPdf } = await import("./services/payslipPdfService.js");
    const result = await generatePayslipPdf(req.params.payslipId);
    return res.download(result.filepath, result.filename);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Route standalone bulletin PDF (sans runId)
api.get("/payslips/:payslipId/pdf", async (req, res) => {
  try {
    const { generatePayslipPdf } = await import("./services/payslipPdfService.js");
    const result = await generatePayslipPdf(req.params.payslipId);
    return res.download(result.filepath, result.filename);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Calculate run
api.post("/payroll/runs/:runId/calculate", async (req, res) => {
  try {
    const { calculatePayrollRun } = await import("./services/payrollCalculationService.js");
    const result = await calculatePayrollRun(req.params.runId);

    // Normalize response to match frontend PayrollCalculationResult interface
    const errorsList = (result.results || [])
      .filter(r => r.error)
      .map(r => ({ employeeId: r.employeeId, message: r.error }));

    res.json({
      success: true,
      message: `Calcul terminé : ${result.processed} traité(s), ${result.errors} erreur(s)`,
      payrollRunId: result.runId,
      processedCount: result.processed ?? 0,
      errorCount: result.errors ?? 0,
      totalGross: result.totalGross ?? 0,
      totalNet: result.totalNet ?? 0,
      totalEmployerContributions: result.totalErCharges ?? 0,
      errors: errorsList,
      ...result,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Validate / Lock run
api.post("/payroll/runs/:runId/validate", async (req, res) => {
  try {
    const run = await prisma.payrollRun.update({
      where: { id: req.params.runId },
      data: { status: "COMPLETED" },
    });
    res.json(run);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post("/payroll/runs/:runId/lock", async (req, res) => {
  try {
    const run = await prisma.payrollRun.update({
      where: { id: req.params.runId },
      data: { status: "LOCKED" },
    });
    res.json(run);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
  const constrained = {
    ...config,
    cnssEnabled: !!license.cnssEnabled,
    irEnabled: !!license.taxEnabled,
    damancomEnabled: !!license.damancomEnabled,
    cimrEnabled: !!license.cimrEnabled,
  };
  constrained.amoEnabled = !!license.cnssEnabled;

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

// ── 3. GET / — Config de l'entreprise connectée ──────────────────────────────
api.get("/payroll-config", requireAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    // ✅ FIX 2 : vérification correcte du rôle (retire || !companyId qui causait la fuite)
    const isSuperAdmin = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN';

    console.log("GET /payroll-config - companyId:", companyId, "isSuperAdmin:", isSuperAdmin);

    // Super Admin → toutes les configs
    if (isSuperAdmin) {
      console.log("Super Admin - retourne toutes les configs");
      const configs = await prisma.payrollConfig.findMany({
        include: { company: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" }
      });
      return res.json(configs);
    }

    // ✅ FIX 2 : Admin sans companyId → erreur explicite (plus de fuite vers findMany)
    if (!companyId) {
      return res.status(403).json({ error: "Aucune entreprise associée à cet utilisateur." });
    }

    // Admin normal → config de son entreprise uniquement
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

    const constrained = applyLicenseToPayrollConfig(config, license);
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
    const isSuperAdmin = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN';

    console.log("POST /payroll-config - body:", req.body);
    console.log("userCompanyId:", userCompanyId);
    console.log("isSuperAdmin:", isSuperAdmin);

    let targetCompanyId = companyId;

    if (isSuperAdmin) {
      if (!targetCompanyId) {
        return res.status(400).json({
          error: "companyId requis dans le body pour Super Admin"
        });
      }
    } else {
      if (!userCompanyId) {
        return res.status(400).json({
          error: "Utilisateur non associé à une entreprise"
        });
      }
      // ✅ Admin normal ne peut créer que pour sa propre entreprise
      targetCompanyId = userCompanyId;
    }

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

// ── 8. DELETE /:id — Supprimer config (Super Admin OU Admin pour sa propre entreprise)
api.delete("/payroll-config/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN';

    const config = await prisma.payrollConfig.findUnique({ where: { id } });
    if (!config) return res.status(404).json({ error: 'Configuration non trouvée' });

    // Admin : ne peut supprimer QUE la config de sa propre entreprise
    if (!isSuperAdmin && config.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez supprimer que la configuration de votre entreprise.' });
    }

    await prisma.payrollConfig.delete({ where: { id } });
    res.json({ message: 'Configuration supprimée avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /payroll-config/:id:', error);
    res.status(400).json({ error: error.message });
  }
});

// ─── StatutoryRates (Taux légaux CNSS/AMO/etc.) ───────────────────────────────
import * as statutoryRateSvc from "./services/StatutoryrateService .js";

api.get("/payroll/statutory-rates", async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    const companyId = isSuperAdmin
      ? (req.query.companyId || null)
      : (req.user?.companyId || null);
    const rates = await statutoryRateSvc.getAllRates(companyId);
    // Map DB fields -> frontend interface (ceilingAmount->ceiling, add version)
    const mapped = rates.map(r => ({
      id: r.id,
      code: r.code,
      label: r.label,
      rate: Number(r.rate),
      ceiling: r.ceilingAmount != null ? Number(r.ceilingAmount) : undefined,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo ?? undefined,
      version: 1,
      isActive: r.isActive,
      companyId: r.companyId,
    }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post("/payroll/statutory-rates", requireAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    const body = { ...req.body };
    // For non-super-admin, force their company
    if (!isSuperAdmin) {
      body.companyId = req.user?.companyId || null;
    }
    // Map frontend field names -> DB field names
    if (body.ceiling !== undefined) { body.ceilingAmount = body.ceiling; delete body.ceiling; }
    if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo)   body.effectiveTo   = new Date(body.effectiveTo);
    if (body.rate !== undefined) body.rate = parseFloat(body.rate);
    if (body.ceilingAmount !== undefined && body.ceilingAmount !== null) body.ceilingAmount = parseFloat(body.ceilingAmount);
    delete body.version; // version not stored in DB
    const rate = await statutoryRateSvc.createRate(body);
    res.status(201).json({ ...rate, ceiling: rate.ceilingAmount, version: 1 });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

api.put("/payroll/statutory-rates/:id", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.ceiling !== undefined) { body.ceilingAmount = body.ceiling; delete body.ceiling; }
    if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo)   body.effectiveTo   = new Date(body.effectiveTo);
    if (body.rate !== undefined) body.rate = parseFloat(body.rate);
    if (body.ceilingAmount !== undefined && body.ceilingAmount !== null) body.ceilingAmount = parseFloat(body.ceilingAmount);
    delete body.version;
    const rate = await statutoryRateSvc.updateRate(req.params.id, body);
    res.json({ ...rate, ceiling: rate.ceilingAmount, version: 1 });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

api.delete("/payroll/statutory-rates/:id", requireAdmin, async (req, res) => {
  try {
    await statutoryRateSvc.deactivateRate(req.params.id);
    res.json({ message: "Taux désactivé avec succès" });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// Seed des taux légaux marocains par défaut
api.post("/payroll/statutory-rates/seed", requireAdmin, async (req, res) => {
  try {
    const NATIONAL_TODAY = new Date("2026-01-01");
    const STATUTORY_RATES = [
      { code: "CNSS_EMPLOYEE",   label: "CNSS Part Salariale (4.48%)",                  rate: 0.0448,  ceilingAmount: 6000, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "CNSS_EMPLOYER",   label: "CNSS Part Patronale (8.60%)",                  rate: 0.0860,  ceilingAmount: 6000, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "AMO_EMPLOYEE",    label: "AMO Part Salariale (1.82%)",                   rate: 0.0182,  ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "AMO_EMPLOYER",    label: "AMO Part Patronale (1.47%)",                   rate: 0.0147,  ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "TRAINING_TAX",    label: "Taxe de Formation Professionnelle (1.6%)",     rate: 0.016,   ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "FAMILY_ALLOWANCE",label: "Allocations Familiales (6.40%)",               rate: 0.064,   ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "SOCIAL_BENEFITS", label: "Prestations Sociales (0.53%)",                 rate: 0.0053,  ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { code: "CIMR_EMPLOYEE",   label: "CIMR Part Salariale (3%)",                     rate: 0.03,    ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: false },
      { code: "CIMR_EMPLOYER",   label: "CIMR Part Patronale (3%)",                     rate: 0.03,    ceilingAmount: null, effectiveFrom: NATIONAL_TODAY, isActive: false },
    ];
    let created = 0;
    for (const r of STATUTORY_RATES) {
      const existing = await prisma.statutoryRate.findFirst({ where: { code: r.code, isActive: true } });
      if (!existing) { await prisma.statutoryRate.create({ data: r }); created++; }
    }
    res.json({ message: `Seed terminé : ${created} taux créés`, created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TaxBrackets (Barème IR) ──────────────────────────────────────────────────
api.get("/payroll/tax-brackets", async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    const { code: taxCode = "IR_SALAIRE" } = req.query;
    const companyId = isSuperAdmin
      ? (req.query.companyId || null)
      : (req.user?.companyId || null);
    const rows = await prisma.taxBracket.findMany({
      where: { AND: [{ taxCode }, { OR: [{ companyId: companyId || null }, { companyId: null }] }, { isActive: true }] },
      orderBy: [{ annualFrom: "asc" }],
    });
    // Map DB fields -> frontend interface
    const mapped = rows.map(b => ({
      id: b.id,
      code: b.taxCode,
      minAmount: Number(b.annualFrom),
      maxAmount: b.annualTo != null ? Number(b.annualTo) : undefined,
      rate: Number(b.rate),
      deduction: Number(b.deductionAmount),
      effectiveFrom: b.effectiveFrom,
      effectiveTo: b.effectiveTo ?? undefined,
      version: b.version ?? 1,
      isActive: b.isActive,
      companyId: b.companyId,
    }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post("/payroll/tax-brackets", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    // Map frontend field names -> DB field names
    if (body.code)      { body.taxCode = body.code;           delete body.code; }
    if (body.minAmount !== undefined) { body.annualFrom = body.minAmount; delete body.minAmount; }
    if (body.maxAmount !== undefined || body.maxAmount === null) { body.annualTo = body.maxAmount ?? null; delete body.maxAmount; }
    if (body.deduction !== undefined) { body.deductionAmount = body.deduction; delete body.deduction; }
    delete body.version;
    if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo)   body.effectiveTo   = new Date(body.effectiveTo);
    if (body.annualFrom !== undefined) body.annualFrom = parseFloat(body.annualFrom);
    if (body.annualTo   !== undefined && body.annualTo !== null) body.annualTo = parseFloat(body.annualTo);
    if (body.rate !== undefined) body.rate = parseFloat(body.rate);
    if (body.deductionAmount !== undefined) body.deductionAmount = parseFloat(body.deductionAmount);
    const bracket = await statutoryRateSvc.createTaxBracket(body);
    res.status(201).json({
      ...bracket,
      code: bracket.taxCode,
      minAmount: Number(bracket.annualFrom),
      maxAmount: bracket.annualTo != null ? Number(bracket.annualTo) : undefined,
      deduction: Number(bracket.deductionAmount),
      version: 1,
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

api.put("/payroll/tax-brackets/:id", requireAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.code)      { body.taxCode = body.code;           delete body.code; }
    if (body.minAmount !== undefined) { body.annualFrom = body.minAmount; delete body.minAmount; }
    if (body.maxAmount !== undefined || body.maxAmount === null) { body.annualTo = body.maxAmount ?? null; delete body.maxAmount; }
    if (body.deduction !== undefined) { body.deductionAmount = body.deduction; delete body.deduction; }
    delete body.version;
    if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo)   body.effectiveTo   = new Date(body.effectiveTo);
    if (body.annualFrom !== undefined) body.annualFrom = parseFloat(body.annualFrom);
    if (body.annualTo   !== undefined && body.annualTo !== null) body.annualTo = parseFloat(body.annualTo);
    if (body.rate !== undefined) body.rate = parseFloat(body.rate);
    if (body.deductionAmount !== undefined) body.deductionAmount = parseFloat(body.deductionAmount);
    const bracket = await statutoryRateSvc.updateTaxBracket(req.params.id, body);
    res.json({
      ...bracket,
      code: bracket.taxCode,
      minAmount: Number(bracket.annualFrom),
      maxAmount: bracket.annualTo != null ? Number(bracket.annualTo) : undefined,
      deduction: Number(bracket.deductionAmount),
      version: 1,
    });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

api.delete("/payroll/tax-brackets/:id", requireAdmin, async (req, res) => {
  try {
    await statutoryRateSvc.deactivateTaxBracket(req.params.id);
    res.json({ message: "Tranche IR désactivée avec succès" });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// Seed du barème IR marocain 2026 par défaut
api.post("/payroll/tax-brackets/seed", requireAdmin, async (req, res) => {
  try {
    const NATIONAL_TODAY = new Date("2026-01-01");
    const TAX_BRACKETS = [
      { taxCode: "IR_SALAIRE", annualFrom: 0,      annualTo: 30000,  rate: 0.00, deductionAmount: 0,     effectiveFrom: NATIONAL_TODAY, isActive: true },
      { taxCode: "IR_SALAIRE", annualFrom: 30001,  annualTo: 50000,  rate: 0.10, deductionAmount: 3000,  effectiveFrom: NATIONAL_TODAY, isActive: true },
      { taxCode: "IR_SALAIRE", annualFrom: 50001,  annualTo: 60000,  rate: 0.20, deductionAmount: 8000,  effectiveFrom: NATIONAL_TODAY, isActive: true },
      { taxCode: "IR_SALAIRE", annualFrom: 60001,  annualTo: 80000,  rate: 0.30, deductionAmount: 14000, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { taxCode: "IR_SALAIRE", annualFrom: 80001,  annualTo: 180000, rate: 0.34, deductionAmount: 17200, effectiveFrom: NATIONAL_TODAY, isActive: true },
      { taxCode: "IR_SALAIRE", annualFrom: 180001, annualTo: null,   rate: 0.37, deductionAmount: 22600, effectiveFrom: NATIONAL_TODAY, isActive: true },
    ];
    let created = 0;
    for (const b of TAX_BRACKETS) {
      const existing = await prisma.taxBracket.findFirst({ where: { taxCode: b.taxCode, annualFrom: b.annualFrom, isActive: true } });
      if (!existing) { await prisma.taxBracket.create({ data: b }); created++; }
    }
    res.json({ message: `Seed IR terminé : ${created} tranches créées`, created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Mount API ────────────────────────────────────────────────────────────────
app.use('/api', api);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route introuvable." }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur interne." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));

export default app;