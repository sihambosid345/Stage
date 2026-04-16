import * as companyService from "../services/companyService.js";

const isSA = (u) => u?.isSuperAdmin || u?.role === "SUPER_ADMIN";

export const createCompany = async (req, res) => {
  try {
    // Seul le super admin peut créer via cette route standard aussi
    if (!isSA(req.user)) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    res.status(201).json(await companyService.createCompany(req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const companyId = isSA(req.user) ? undefined : req.user.companyId;
    res.json(await companyService.getCompanies(companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Route GET /companies/mine — retourne uniquement la company de l'utilisateur
export const getMyCompany = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ error: "Aucune entreprise associée à votre compte." });
    }
    const company = await companyService.getCompanyById(req.user.companyId);
    res.json([company]);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    // Un non-super-admin ne peut consulter que sa propre company
    if (!isSA(req.user) && req.user.companyId !== req.params.id) {
      return res.status(403).json({ error: "Accès refusé à cette entreprise." });
    }
    res.json(await companyService.getCompanyById(req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    // Un admin peut modifier uniquement SA company ; le super admin peut tout
    if (!isSA(req.user) && req.user.companyId !== req.params.id) {
      return res.status(403).json({ error: "Accès refusé à cette entreprise." });
    }
    res.json(await companyService.updateCompany(req.params.id, req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    // Seul le super admin peut supprimer une entreprise
    if (!isSA(req.user)) {
      return res.status(403).json({ error: "Seul le super admin peut supprimer une entreprise." });
    }
    await companyService.deleteCompany(req.params.id);
    res.json({ message: "Entreprise supprimée." });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};