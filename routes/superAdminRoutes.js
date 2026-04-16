import express from "express";
import * as superAdminController from "../controllers/superAdminController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { roleMiddleware } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

const SA = [authenticate, roleMiddleware(["SUPER_ADMIN"])];

// ── Entreprises ────────────────────────────────────────────────────────────
router.get("/companies",              ...SA, superAdminController.getAllCompanies);
router.post("/companies",             ...SA, superAdminController.createCompany);

// ── Utilisateurs d'une entreprise ─────────────────────────────────────────
router.get("/companies/:companyId/users", ...SA, superAdminController.getCompanyUsers);

// ── Licences ──────────────────────────────────────────────────────────────
router.post("/licenses",              ...SA, superAdminController.createOrUpdateLicense);

// ── Admins ────────────────────────────────────────────────────────────────
router.post("/company-admins",        ...SA, superAdminController.createCompanyAdmin);
router.post("/admins",                ...SA, superAdminController.createSuperAdmin);

export default router;