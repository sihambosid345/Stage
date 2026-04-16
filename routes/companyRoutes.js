import express from "express";
import * as controller from "../controllers/companyController.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();

router.post("/",         authenticate, controller.createCompany);
router.get("/",          authenticate, controller.getCompanies);
router.get("/mine",      authenticate, controller.getMyCompany);   // ← route spéciale non-SA
router.get("/:id",       authenticate, controller.getCompany);
router.put("/:id",       authenticate, controller.updateCompany);
router.delete("/:id",    authenticate, controller.deleteCompany);

export default router;