import express from "express";
import * as controller from "../controllers/departmentController.js";

const router = express.Router();

// ⚠️ IMPORTANT : Les routes spécifiques AVANT les routes paramétrées
// Sinon Express va interpréter "company" comme un :id

// GET /departments/company/:companyId - Départements d'une entreprise
router.get("/company/:companyId", controller.getDepartmentsByCompany);

// POST /departments - Créer un département
router.post("/", controller.createDepartment);

// GET /departments - Tous les départements
router.get("/", controller.getDepartments);

// GET /departments/:id - Un département
router.get("/:id", controller.getDepartment);

// PUT /departments/:id - Modifier un département
router.put("/:id", controller.updateDepartment);

// DELETE /departments/:id - Supprimer un département
router.delete("/:id", controller.deleteDepartment);

export default router;