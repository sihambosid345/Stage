import express from "express";
import * as controller from "../controllers/licenseController.js";
import { blockAdminsFromLicenses } from "../middlewares/authenticate.js";

const router = express.Router();

router.post("/", blockAdminsFromLicenses, controller.createLicense);
router.get("/", controller.getLicenses);
router.get("/company/:companyId", controller.getLicenseByCompany);
router.get("/:id", controller.getLicense);
router.put("/:id", blockAdminsFromLicenses, controller.updateLicense);
router.delete("/:id", blockAdminsFromLicenses, controller.deleteLicense);

export default router;