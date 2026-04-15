import * as companyService from "../services/companyService.js";

export const createCompany = async (req, res) => {
  try { res.status(201).json(await companyService.createCompany(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getCompanies = async (req, res) => {
  try {
    const companyId = (req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') ? undefined : req.user.companyId;
    res.json(await companyService.getCompanies(companyId));
  }
  catch (error) { res.status(500).json({ error: error.message }); }
};
// Route accessible à tous les users authentifiés — retourne uniquement leur company
export const getMyCompany = async (req, res) => {
  try {
    const company = await companyService.getCompanyById(req.user.companyId);
    res.json([company]); // retourne un tableau pour garder la compatibilité avec getAll()
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getCompany = async (req, res) => {
  try {
    if (!(req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') && req.user.companyId !== req.params.id) {
      return res.status(403).json({ error: "Accès refusé à cette entreprise." });
    }
    res.json(await companyService.getCompanyById(req.params.id));
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateCompany = async (req, res) => {
  try { res.json(await companyService.updateCompany(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteCompany = async (req, res) => {
  try { await companyService.deleteCompany(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};

