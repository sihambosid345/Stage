import express from "express";
import * as superAdminController from "../controllers/superAdminController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { roleMiddleware } from "../middlewares/rbacMiddleware.js";

const router = express.Router();
const SA = [authenticate, roleMiddleware(["SUPER_ADMIN"])];

router.get ("/dashboard",                        ...SA, superAdminController.getDashboardStats);
router.post("/companies",                        ...SA, superAdminController.createCompany);
router.get ("/companies",                        ...SA, superAdminController.getAllCompanies);
router.get ("/companies/:companyId/users",       ...SA, superAdminController.getCompanyUsers);
router.post("/company-admins",                   ...SA, superAdminController.createCompanyAdmin);
router.post("/admins",                           ...SA, superAdminController.createSuperAdmin);
router.post("/companies-with-license-and-users", ...SA, superAdminController.createCompanyWithLicenseAndUsers);

// ✅ Route corrigée — pointe vers createOrUpdateLicense
router.post("/licenses", ...SA, superAdminController.createOrUpdateLicense);

export default router;