import * as companyService from "../services/companyService.js";

export const createCompany = async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);
    res.status(201).json(company);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    const companyId = isSuperAdmin ? undefined : req.user?.companyId;
    const companies = await companyService.getCompanies(companyId);
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    if (!req.user?.companyId) {
      return res.status(403).json({ error: "Aucune entreprise associée à cet utilisateur" });
    }
    const company = await companyService.getCompanyById(req.user.companyId);
    res.json([company]);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin && req.user?.companyId !== req.params.id) {
      return res.status(403).json({ error: "Accès refusé à cette entreprise." });
    }
    const company = await companyService.getCompanyById(req.params.id);
    res.json(company);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin && req.user?.companyId !== req.params.id) {
      return res.status(403).json({ error: "Accès refusé. Vous ne pouvez modifier que votre entreprise." });
    }
    const updated = await companyService.updateCompany(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Seul un Super Admin peut supprimer une entreprise." });
    }

    const force = true;

    await companyService.deleteCompany(req.params.id, force);

    res.json({
      message: "Entreprise et toutes ses données supprimées avec succès",
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
      details: error.details || undefined,
    });
  }
};