import * as periodService from "../services/payrollPeriodService.js";

/** Formatte les erreurs métier pour le client Angular */
const handleError = (res, error) => {
  const status = error?.status || 400;
  const payload = {
    error:  error?.message || "Erreur serveur",
    code:   error?.code   || null,
    ...(error?.existingPeriod ? { existingPeriod: error.existingPeriod } : {}),
  };
  return res.status(status).json(payload);
};

export const createPeriod = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    res.status(201).json(await periodService.createPeriod(req.body, userId));
  } catch (error) {
    // Doublon Prisma (contrainte unique) – message enrichi
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "Une période existe déjà pour cette entreprise, cette année et ce mois.",
        code:  "DUPLICATE_PERIOD",
      });
    }
    handleError(res, error);
  }
};

export const getPeriods = async (req, res) => {
  try {
    const companyId = req.query?.companyId ?? null;
    res.json(await periodService.getPeriods(companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPeriod = async (req, res) => {
  try {
    res.json(await periodService.getPeriodById(req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, code: error.code });
  }
};

/**
 * GET /payroll-periods/open/:companyId
 * Retourne la période OPEN de l'entreprise ou { open: false }.
 */
export const getOpenPeriod = async (req, res) => {
  try {
    const period = await periodService.getOpenPeriod(req.params.companyId);
    if (period) {
      res.json({ open: true, period });
    } else {
      res.json({ open: false, period: null });
    }
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updatePeriod = async (req, res) => {
  try {
    res.json(await periodService.updatePeriod(req.params.id, req.body));
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "Une période existe déjà pour cette entreprise, cette année et ce mois.",
        code:  "DUPLICATE_PERIOD",
      });
    }
    handleError(res, error);
  }
};

export const deletePeriod = async (req, res) => {
  try {
    await periodService.deletePeriod(req.params.id);
    res.json({ message: "Période supprimée." });
  } catch (error) {
    handleError(res, error);
  }
};

export const closePeriod = async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    const result = await periodService.closePeriodAndOpenNext(req.params.id, userId);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};