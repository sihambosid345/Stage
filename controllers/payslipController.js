import * as payslipService from "../services/payslipService.js";
import * as payslipPdfService from "../services/payslipPdfService.js";

export const createPayslip = async (req, res) => {
  try {
    res.status(201).json(await payslipService.createPayslip(req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getPayslips = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";

    // SUPER_ADMIN : peut passer ?companyId= ou voir tous les bulletins
    // Admin / User : limité à leur propre entreprise
    const companyId = isSuperAdmin
      ? (req.query.companyId || null)
      : (req.user?.companyId || null);

    res.json(await payslipService.getPayslips(companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayslip = async (req, res) => {
  try {
    const payslip = await payslipService.getPayslipById(req.params.id);

    // Sécurité : non-superadmin ne peut voir que ses propres bulletins
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin && payslip.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    res.json(payslip);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getPayslipsByEmployee = async (req, res) => {
  try {
    res.json(await payslipService.getPayslipsByEmployee(req.params.employeeId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// ─── Génération PDF ──────────────────────────────────────────────────────────
export const generatePayslipPdf = async (req, res) => {
  try {
    const payslip = await payslipService.getPayslipById(req.params.id);

    // Sécurité : vérifier l'accès
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin && payslip.companyId !== req.user?.companyId) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    const result = await payslipPdfService.generatePayslipPdf(req.params.id);
    res.json({
      success: true,
      message: "Bulletin PDF généré avec succès",
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// ─── Générer les PDFs en masse ────────────────────────────────────────────────
export const generatePayslipsPdf = async (req, res) => {
  try {
    const { payslipIds, payrollPeriodId } = req.body;

    if (!payslipIds && !payrollPeriodId) {
      return res.status(400).json({ error: "payslipIds ou payrollPeriodId est requis" });
    }

    let result;
    if (payrollPeriodId) {
      result = await payslipPdfService.regeneratePayslipPdfsByPeriod(payrollPeriodId);
    } else {
      result = await payslipPdfService.generatePayslipsBatch(payslipIds);
    }

    res.json({
      success: true,
      message: `${result.results.length} bulletin(s) généré(s)`,
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// ─── Télécharger un PDF ──────────────────────────────────────────────────────
export const downloadPayslipPdf = async (req, res) => {
  try {
    const filepath = await payslipPdfService.getPayslipPdf(req.params.filename);
    res.download(filepath);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getPayslipsByPeriod = async (req, res) => {
  try {
    res.json(await payslipService.getPayslipsByPeriod(req.params.periodId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updatePayslip = async (req, res) => {
  try {
    res.json(await payslipService.updatePayslip(req.params.id, req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deletePayslip = async (req, res) => {
  try {
    await payslipService.deletePayslip(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};