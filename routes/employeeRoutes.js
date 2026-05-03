import express from "express";
import * as controller from "../controllers/employeeController.js";
const router = express.Router();

router.post("/", controller.createEmployee);
router.get("/by-departments", controller.getEmployeesByDepartments);
router.get("/", controller.getEmployees);
router.get("/:id", controller.getEmployee);
router.put("/:id", controller.updateEmployee);
router.delete("/:id", controller.deleteEmployee);

export default router;