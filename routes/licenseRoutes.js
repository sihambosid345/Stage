import express from "express";
import * as controller from "../controllers/licenseController.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();

// authenticate est appliqué sur toutes les routes (via server.js ou ici)
// La logique d'accès SUPER_ADMIN est dans le controller
router.post("/",                         authenticate, controller.createLicense);
router.get("/",                          authenticate, controller.getLicenses);
router.get("/company/:companyId",        authenticate, controller.getLicenseByCompany);
router.get("/:id",                       authenticate, controller.getLicense);
router.put("/:id",                       authenticate, controller.updateLicense);
router.delete("/:id",                   authenticate, controller.deleteLicense);

export default router;