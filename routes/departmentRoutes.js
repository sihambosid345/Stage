import express from "express";
import * as controller from "../controllers/departmentController.js";

const router = express.Router();

router.post("/", controller.createDepartment);
router.get("/", controller.getDepartments);
router.get("/:id", controller.getDepartment);
router.put("/:id", controller.updateDepartment);
router.delete("/:id", controller.deleteDepartment);

export default router;