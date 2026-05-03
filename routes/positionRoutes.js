import express from "express";
import * as controller from "../controllers/positionController.js";

const router = express.Router();

// ⚠️ IMPORTANT : Route spécifique AVANT la route paramétrée /:id
// GET /positions/department/:departmentId
router.get("/department/:departmentId", controller.getPositionsByDepartment);

// POST /positions
router.post("/", controller.createPosition);

// GET /positions
router.get("/", controller.getPositions);

// GET /positions/:id
router.get("/:id", controller.getPosition);

// PUT /positions/:id
router.put("/:id", controller.updatePosition);

// DELETE /positions/:id
router.delete("/:id", controller.deletePosition);

export default router;