import * as payrollConfigService from "../services/payrollConfigService.js";

// Routes pour admin (existantes)
export const getPayrollConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const config = await payrollConfigService.getPayrollConfigByCompany(companyId);
    res.json(config);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const createPayrollConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const config = await payrollConfigService.createPayrollConfig({
      companyId,
      ...req.body
    });
    res.status(201).json(config);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const updatePayrollConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const config = await payrollConfigService.updatePayrollConfig(companyId, req.body);
    res.json(config);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const upsertPayrollConfig = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const config = await payrollConfigService.upsertPayrollConfig(companyId, req.body);
    res.json(config);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

// ✅ NOUVELLES ROUTES POUR SUPER ADMIN
export const getAllPayrollConfigs = async (req, res) => {
  try {
    const configs = await payrollConfigService.getAllPayrollConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayrollConfigByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.params;
    const config = await payrollConfigService.getPayrollConfigByCompany(companyId);
    res.json(config);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updatePayrollConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await payrollConfigService.updatePayrollConfigById(id, req.body);
    res.json(config);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deletePayrollConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await payrollConfigService.deletePayrollConfig(id);
    res.json({ message: "Configuration supprimée avec succès" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};