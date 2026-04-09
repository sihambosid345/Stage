import express from "express";
import * as controller from "../controllers/licenseController.js";

const router = express.Router();

router.post("/", controller.createLicense);
router.get("/", controller.getLicenses);
router.get("/company/:companyId", controller.getLicenseByCompany);
router.get("/:id", controller.getLicense);
router.put("/:id", controller.updateLicense);
router.delete("/:id", controller.deleteLicense);

export default router;