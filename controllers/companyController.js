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
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    const companyId = isSuperAdmin ? undefined : req.user?.companyId;
    
    console.log(`📋 Getting companies - SuperAdmin: ${isSuperAdmin}, CompanyId: ${companyId || 'ALL'}`);
    
    const companies = await companyService.getCompanies(companyId);
    
    console.log(`✅ Found ${companies.length} companies`);
    res.json(companies);
  } catch (error) {
    console.error('Error getting companies:', error);
    res.status(500).json({ error: error.message });
  }
};

// Route accessible à tous les users authentifiés — retourne uniquement leur company
export const getMyCompany = async (req, res) => {
  try {
    if (!req.user?.companyId) {
      return res.status(403).json({ error: "Aucune entreprise associée à cet utilisateur" });
    }
    const company = await companyService.getCompanyById(req.user.companyId);
    res.json([company]); // retourne un tableau pour garder la compatibilité avec getAll()
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    
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
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    
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
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    
    if (!isSuperAdmin) {
      return res.status(403).json({ error: "Seul un Super Admin peut supprimer une entreprise." });
    }
    
    await companyService.deleteCompany(req.params.id);
    res.json({ message: "Entreprise supprimée avec succès" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};