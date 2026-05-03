import "dotenv/config";
import express    from "express";
import cors       from "cors";
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes                    from "./routes/authRoutes.js";
import superAdminRoutes             from "./routes/superAdminRoutes.js";
import { authenticate, requireAdmin, requireSuperAdmin } from "./middlewares/authenticate.js";
import { licenseMiddleware }       from "./middlewares/licenseMiddleware.js";

import * as companyCtrl    from "./controllers/companyController.js";
import * as userCtrl       from "./controllers/userController.js";
import * as departmentCtrl from "./controllers/departmentController.js";
import * as positionCtrl   from "./controllers/positionController.js";
import * as employeeCtrl   from "./controllers/employeeController.js";
import * as contractCtrl   from "./controllers/employeeContractController.js";
import * as attendanceCtrl from "./controllers/attendanceController.js";
import * as variableCtrl   from "./controllers/variableItemController.js";
import * as licenseCtrl    from "./controllers/licenseController.js";
console.log("JWT_SECRET =", process.env.JWT_SECRET);
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:4200", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for PDFs and other uploads)
app.use(express.static(path.join(__dirname, 'public')));

// ─── Public ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/super-admin", superAdminRoutes);

// ─── Protected ───────────────────────────────────────────────────────────────

const api = Router();
// Authentification requise pour toutes les routes protégées
// requireAdmin s'applique seulement sur les routes sensibles (users, companies, licenses)
api.use(authenticate);
api.use(licenseMiddleware);

// Companies — super admin only for global company management
// IMPORTANT: /companies/mine doit être AVANT /companies/:id pour éviter le conflit de route
api.post  ("/companies",      requireSuperAdmin, companyCtrl.createCompany);
api.get   ("/companies/mine", companyCtrl.getMyCompany);  // ← avant /:id
api.get   ("/companies",      requireSuperAdmin, companyCtrl.getCompanies);
api.get   ("/companies/:id",  companyCtrl.getCompany);
api.put   ("/companies/:id",  companyCtrl.updateCompany);
api.delete("/companies/:id",  requireSuperAdmin, companyCtrl.deleteCompany);

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
api.get("/departments/company/:companyId", departmentCtrl.getDepartmentsByCompany);
api.put   ("/departments/:id", departmentCtrl.updateDepartment);
api.delete("/departments/:id", departmentCtrl.deleteDepartment);

// Positions
api.post  ("/positions",     positionCtrl.createPosition);
api.get   ("/positions",     positionCtrl.getPositions);
api.get   ("/positions/:id", positionCtrl.getPosition);
api.get("/positions/department/:departmentId", positionCtrl.getPositionsByDepartment);
api.put   ("/positions/:id", positionCtrl.updatePosition);
api.delete("/positions/:id", positionCtrl.deletePosition);

// Employees
api.post  ("/employees",     employeeCtrl.createEmployee);
api.get   ("/employees",     employeeCtrl.getEmployees);
api.get   ("/employees/:id", employeeCtrl.getEmployee);
api.get("/employees/position/:positionId", employeeCtrl.getEmployeesByPosition);
api.put   ("/employees/:id", employeeCtrl.updateEmployee);
api.delete("/employees/:id", employeeCtrl.deleteEmployee);

// Contracts
api.post  ("/contracts",                            contractCtrl.createContract);
api.get   ("/contracts",                            contractCtrl.getContracts);
api.post  ("/contracts/:id/generate-pdf",           contractCtrl.generateContractPdf);
api.get   ("/contracts/pdf/:filename",              contractCtrl.downloadContractPdf);
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

// Variable Items
api.post  ("/variable-items",                     variableCtrl.createVariableItem);
api.get   ("/variable-items",                     variableCtrl.getVariableItems);
api.get   ("/variable-items/:id",                 variableCtrl.getVariableItem);
api.get   ("/variable-items/employee/:employeeId",variableCtrl.getVariableItemsByEmployee);
api.put   ("/variable-items/:id",                 variableCtrl.updateVariableItem);
api.delete("/variable-items/:id",                 variableCtrl.deleteVariableItem);

// Licenses — gestion par super admin uniquement, lecture possible pour admins sur leur entreprise
api.post  ("/licenses",                           requireSuperAdmin, licenseCtrl.createLicense);
api.get   ("/licenses",                           requireSuperAdmin, licenseCtrl.getLicenses);
api.get   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.getLicense);
api.get   ("/licenses/company/:companyId",        requireAdmin, licenseCtrl.getLicenseByCompany);
api.put   ("/licenses/:id",                       requireSuperAdmin, licenseCtrl.updateLicense);
api.delete("/licenses/:id",                       requireSuperAdmin, licenseCtrl.deleteLicense);

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