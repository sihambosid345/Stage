/**
 * Routes : Moteur de Paie
 * POST /api/payroll-calculation/run/:runId  → Lance le calcul complet
 * GET  /api/payroll-calculation/rates       → Taux actifs
 * GET  /api/payroll-calculation/brackets    → Barème IR actif
 */

import express from "express";
import { calculatePayrollRun } from "../services/payrollCalculationService.js";
import { getAllRates } from "../services/statutoryRateService.js";

const router = express.Router();

// ── Lancer le calcul d'un PayrollRun ─────────────────────────────────────────
router.post("/run/:runId", async (req, res, next) => {
  try {
    const result = await calculatePayrollRun(req.params.runId);
    res.json({
      success: true,
      message: `Calcul terminé : ${result.processed} employé(s) traité(s), ${result.errors} erreur(s)`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// ── Consulter les taux statutaires actifs ─────────────────────────────────────
router.get("/rates", async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const rates = await getAllRates(companyId || null);
    res.json({ success: true, data: rates });
  } catch (err) {
    next(err);
  }
});

// ── Consulter le barème IR actif ──────────────────────────────────────────────
router.get("/brackets", async (req, res, next) => {
  try {
    const { companyId, taxCode = "IR_SALAIRE", effectiveDate } = req.query;
    const date = effectiveDate ? new Date(effectiveDate) : new Date();
    const brackets = await getActiveTaxBrackets(date, companyId || null, taxCode);
    res.json({ success: true, data: brackets });
  } catch (err) {
    next(err);
  }
});

export default router;