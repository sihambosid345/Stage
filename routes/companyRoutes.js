import express from "express";
import {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/companyController.js";

const router = express.Router();

router.post("/", createCompany);
router.get("/", getCompanies);
router.get("/:id", getCompany);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);

export default router;