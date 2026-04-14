import express from "express";
import * as superAdminController from "../controllers/superAdminController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { roleMiddleware } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent l'authentification et le rôle SUPER_ADMIN

/**
 * @route POST /super-admin/admins
 * @desc Créer un nouvel utilisateur super admin
 * @access Super Admin only
 */
router.post(
  "/admins",
  authenticate,
  roleMiddleware(["SUPER_ADMIN"]),
  superAdminController.createSuperAdmin
);

/**
 * @route POST /super-admin/companies
 * @desc Créer une nouvelle entreprise
 * @access Super Admin only
 */
router.post(
  "/companies",
  authenticate,
  roleMiddleware(["SUPER_ADMIN"]),
  superAdminController.createCompany
);

/**
 * @route GET /super-admin/companies
 * @desc Obtenir toutes les entreprises
 * @access Super Admin only
 */
router.get(
  "/companies",
  authenticate,
  roleMiddleware(["SUPER_ADMIN"]),
  superAdminController.getAllCompanies
);

/**
 * @route POST /super-admin/company-admins
 * @desc Créer un admin pour une entreprise
 * @access Super Admin only
 */
router.post(
  "/company-admins",
  authenticate,
  roleMiddleware(["SUPER_ADMIN"]),
  superAdminController.createCompanyAdmin
);

/**
 * @route POST /super-admin/licenses
 * @desc Créer une licence pour une entreprise
 * @access Super Admin only
 */
router.post(
  "/licenses",
  authenticate,
  roleMiddleware(["SUPER_ADMIN"]),
  superAdminController.createLicense
);

export default router;
