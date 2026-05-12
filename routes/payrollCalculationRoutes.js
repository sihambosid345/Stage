import express from 'express';
import { calculatePayrollRun } from '../services/payrollCalculationService.js';

const router = express.Router();

// POST /api/payroll-calculation/run/:runId
router.post('/run/:runId', async (req, res, next) => {
  try {
    const result = await calculatePayrollRun(req.params.runId);
    res.json({
      success: true,
      message: `Calcul terminé : ${result.processed} employés traités, ${result.errors} erreurs`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;