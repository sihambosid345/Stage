import express from "express";
import * as controller from "../controllers/payslipController.js";

const router = express.Router();

router.post("/", controller.createPayslip);
router.get("/", controller.getPayslips);
router.get("/employee/:employeeId", controller.getPayslipsByEmployee);
router.get("/period/:periodId", controller.getPayslipsByPeriod);
router.get("/:id", controller.getPayslip);
router.put("/:id", controller.updatePayslip);
router.delete("/:id", controller.deletePayslip);

export default router;