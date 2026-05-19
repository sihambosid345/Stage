import express from "express";
import * as controller from "../controllers/payslipController.js";

const router = express.Router();

// ─── Routes spécifiques (doivent être avant les routes avec :id) ──────────────
router.post("/", controller.createPayslip);
router.get("/", controller.getPayslips);
router.post("/generate-pdfs", controller.generatePayslipsPdf);
router.get("/pdf/download/:filename", controller.downloadPayslipPdf);
router.get("/employee/:employeeId", controller.getPayslipsByEmployee);
router.get("/period/:periodId", controller.getPayslipsByPeriod);

// ─── Routes avec ID ──────────────────────────────────────────────────────────
router.get("/:id", controller.getPayslip);
router.put("/:id", controller.updatePayslip);
router.delete("/:id", controller.deletePayslip);
router.post("/:id/generate-pdf", controller.generatePayslipPdf);

export default router;