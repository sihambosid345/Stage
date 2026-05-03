import express from "express";
import * as controller from "../controllers/employeeContractController.js";

const router = express.Router();

// ─── IMPORTANT : les routes spécifiques AVANT les routes paramétrées ──────────
// Si on met GET "/:id" avant GET "/pdf/:filename", Express va matcher
// "/pdf/monFichier.pdf" comme si "pdf" était un id → bug.

// Routes de listing
router.get("/",                          controller.getContracts);
router.get("/employee/:employeeId",      controller.getContractsByEmployee);

// Routes PDF — doivent être AVANT /:id
router.get("/pdf/:filename",             controller.downloadContractPdf);
router.post("/:id/generate-pdf",         controller.generateContractPdf);

// CRUD standard
router.post("/",                         controller.createContract);
router.get("/:id",                       controller.getContract);
router.put("/:id",                       controller.updateContract);
router.delete("/:id",                    controller.deleteContract);

export default router;