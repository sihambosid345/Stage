import * as licenseService from "../services/licenseService.js";

export const createLicense = async (req, res) => {
  try { res.status(201).json(await licenseService.createLicense(req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const getLicenses = async (req, res) => {
  try { res.json(await licenseService.getLicenses()); }
  catch (error) { res.status(500).json({ error: error.message }); }
};
export const getLicense = async (req, res) => {
  try { res.json(await licenseService.getLicenseById(req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const getLicenseByCompany = async (req, res) => {
  try { res.json(await licenseService.getLicenseByCompany(req.params.companyId)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
};
export const updateLicense = async (req, res) => {
  try { res.json(await licenseService.updateLicense(req.params.id, req.body)); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};
export const deleteLicense = async (req, res) => {
  try { await licenseService.deleteLicense(req.params.id); res.json({ message: "Deleted" }); }
  catch (error) { res.status(error.status || 400).json({ error: error.message }); }
};