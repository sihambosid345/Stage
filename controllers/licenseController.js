import * as licenseService from "../services/licenseService.js";

const isSA = (u) => u?.isSuperAdmin || u?.role === "SUPER_ADMIN";

// Toutes les mutations de licence sont réservées au SUPER_ADMIN
export const createLicense = async (req, res) => {
  try {
    if (!isSA(req.user)) return res.status(403).json({ error: "Accès refusé." });
    res.status(201).json(await licenseService.createLicense(req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

// Lecture : super admin voit tout, autres voient uniquement leur company
export const getLicenses = async (req, res) => {
  try {
    if (!isSA(req.user)) {
      // retourner uniquement la licence de la company de l'utilisateur
      if (!req.user.companyId) return res.json([]);
      const license = await licenseService.getLicenseByCompany(req.user.companyId);
      return res.json(license ? [license] : []);
    }
    res.json(await licenseService.getLicenses());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLicense = async (req, res) => {
  try {
    const license = await licenseService.getLicenseById(req.params.id);
    // Vérification d'accès
    if (!isSA(req.user) && license?.companyId !== req.user.companyId) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    res.json(license);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const getLicenseByCompany = async (req, res) => {
  try {
    if (!isSA(req.user) && req.user.companyId !== req.params.companyId) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    res.json(await licenseService.getLicenseByCompany(req.params.companyId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateLicense = async (req, res) => {
  try {
    if (!isSA(req.user)) return res.status(403).json({ error: "Accès refusé." });
    res.json(await licenseService.updateLicense(req.params.id, req.body));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteLicense = async (req, res) => {
  try {
    if (!isSA(req.user)) return res.status(403).json({ error: "Accès refusé." });
    await licenseService.deleteLicense(req.params.id);
    res.json({ message: "Licence supprimée." });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};