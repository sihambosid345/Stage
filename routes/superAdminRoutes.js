import express from "express";
import * as superAdminController from "../controllers/superAdminController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { roleMiddleware } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent l'authentification et le rôle SUPER_ADMIN
const SA = [authenticate, roleMiddleware(["SUPER_ADMIN"])];

/**
 * Tableau de bord — stats globales
 * GET /super-admin/dashboard
 */
router.get("/dashboard", ...SA, superAdminController.getDashboardStats);

/**
 * Gestion des entreprises
 * POST   /super-admin/companies          → créer une entreprise
 * GET    /super-admin/companies          → lister toutes les entreprises
 * GET    /super-admin/companies/:id/users → utilisateurs d'une entreprise
 */
router.post("/companies",               ...SA, superAdminController.createCompany);
router.get ("/companies",               ...SA, superAdminController.getAllCompanies);
router.get ("/companies/:companyId/users", ...SA, superAdminController.getCompanyUsers);

/**
 * Créer un admin pour une entreprise (ADMIN role)
 * POST /super-admin/company-admins
 */
router.post("/company-admins", ...SA, superAdminController.createCompanyAdmin);

/**
 * Créer un super admin supplémentaire
 * POST /super-admin/admins
 */
router.post("/admins", ...SA, superAdminController.createSuperAdmin);

/**
 * Créer une entreprise avec licence et utilisateurs
 * POST /super-admin/companies-with-license-and-users
 */
router.post("/companies-with-license-and-users", ...SA, superAdminController.createCompanyWithLicenseAndUsers);

export default router;