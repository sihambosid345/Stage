import express    from "express";
import cors       from "cors";
import dotenv     from "dotenv";
import { Router } from "express";

import authRoutes                    from "./routes/authRoutes.js";
import { authenticate, requireAdmin } from "./middlewares/authenticate.js";

import * as companyCtrl    from "./controllers/companyController.js";
import * as userCtrl       from "./controllers/userController.js";
import * as departmentCtrl from "./controllers/departmentController.js";
import * as positionCtrl   from "./controllers/positionController.js";
import * as employeeCtrl   from "./controllers/employeeController.js";
import * as contractCtrl   from "./controllers/employeeContractController.js";
import * as attendanceCtrl from "./controllers/attendanceController.js";
import * as periodCtrl     from "./controllers/payrollPeriodController.js";
import * as runCtrl        from "./controllers/payrollRunController.js";
import * as itemCtrl       from "./controllers/payrollItemController.js";
import * as payslipCtrl    from "./controllers/payslipController.js";
import * as variableCtrl   from "./controllers/variableItemController.js";
import * as licenseCtrl    from "./controllers/licenseController.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:4200", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Public ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);

// ─── Protected ───────────────────────────────────────────────────────────────

const api = Router();
// Authentification requise pour toutes les routes protégées
// requireAdmin s'applique seulement sur les routes sensibles (users, companies, licenses)
api.use(authenticate);

// Companies — admin only (full list)
api.post  ("/companies",     requireAdmin, companyCtrl.createCompany);
api.get   ("/companies",     requireAdmin, companyCtrl.getCompanies);
api.get   ("/companies/mine", companyCtrl.getMyCompany);
api.get   ("/companies/:id", requireAdmin, companyCtrl.getCompany);
api.put   ("/companies/:id", requireAdmin, companyCtrl.updateCompany);
api.delete("/companies/:id", requireAdmin, companyCtrl.deleteCompany);

// Users — admin only
api.post  ("/users",     requireAdmin, userCtrl.createUser);
api.get   ("/users",     requireAdmin, userCtrl.getUsers);
api.get   ("/users/:id", requireAdmin, userCtrl.getUser);
api.put   ("/users/:id", requireAdmin, userCtrl.updateUser);
api.delete("/users/:id", requireAdmin, userCtrl.deleteUser);

// Departments
api.post  ("/departments",     departmentCtrl.createDepartment);
api.get   ("/departments",     departmentCtrl.getDepartments);
api.get   ("/departments/:id", departmentCtrl.getDepartment);
api.put   ("/departments/:id", departmentCtrl.updateDepartment);
api.delete("/departments/:id", departmentCtrl.deleteDepartment);

// Positions
api.post  ("/positions",     positionCtrl.createPosition);
api.get   ("/positions",     positionCtrl.getPositions);
api.get   ("/positions/:id", positionCtrl.getPosition);
api.put   ("/positions/:id", positionCtrl.updatePosition);
api.delete("/positions/:id", positionCtrl.deletePosition);

// Employees
api.post  ("/employees",     employeeCtrl.createEmployee);
api.get   ("/employees",     employeeCtrl.getEmployees);
api.get   ("/employees/:id", employeeCtrl.getEmployee);
api.put   ("/employees/:id", employeeCtrl.updateEmployee);
api.delete("/employees/:id", employeeCtrl.deleteEmployee);

// Contracts
api.post  ("/contracts",                            contractCtrl.createContract);
api.get   ("/contracts",                            contractCtrl.getContracts);
api.get   ("/contracts/:id",                        contractCtrl.getContract);
api.get   ("/contracts/employee/:employeeId",       contractCtrl.getContractsByEmployee);
api.put   ("/contracts/:id",                        contractCtrl.updateContract);
api.delete("/contracts/:id",                        contractCtrl.deleteContract);

// Attendance
api.post  ("/attendances",                          attendanceCtrl.createAttendance);
api.get   ("/attendances",                          attendanceCtrl.getAttendances);
api.get   ("/attendances/:id",                      attendanceCtrl.getAttendance);
api.get   ("/attendances/employee/:employeeId",     attendanceCtrl.getAttendanceByEmployee);
api.put   ("/attendances/:id",                      attendanceCtrl.updateAttendance);
api.delete("/attendances/:id",                      attendanceCtrl.deleteAttendance);

// Payroll Periods
api.post  ("/payroll-periods",     periodCtrl.createPeriod);
api.get   ("/payroll-periods",     periodCtrl.getPeriods);
api.get   ("/payroll-periods/:id", periodCtrl.getPeriod);
api.put   ("/payroll-periods/:id", periodCtrl.updatePeriod);
api.delete("/payroll-periods/:id", periodCtrl.deletePeriod);

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

// Variable Items
api.post  ("/variable-items",                     variableCtrl.createVariableItem);
api.get   ("/variable-items",                     variableCtrl.getVariableItems);
api.get   ("/variable-items/:id",                 variableCtrl.getVariableItem);
api.get   ("/variable-items/employee/:employeeId",variableCtrl.getVariableItemsByEmployee);
api.put   ("/variable-items/:id",                 variableCtrl.updateVariableItem);
api.delete("/variable-items/:id",                 variableCtrl.deleteVariableItem);

// Licenses — admin only
api.post  ("/licenses",                           requireAdmin, licenseCtrl.createLicense);
api.get   ("/licenses",                           requireAdmin, licenseCtrl.getLicenses);
api.get   ("/licenses/:id",                       requireAdmin, licenseCtrl.getLicense);
api.get   ("/licenses/company/:companyId",        requireAdmin, licenseCtrl.getLicenseByCompany);
api.put   ("/licenses/:id",                       requireAdmin, licenseCtrl.updateLicense);
api.delete("/licenses/:id",                       requireAdmin, licenseCtrl.deleteLicense);

app.use(api);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: "Route introuvable." }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur interne." });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`🚀  http://localhost:${PORT}`));

export default app;