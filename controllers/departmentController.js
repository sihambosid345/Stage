import * as departmentService from "../services/departmentService.js";

const getCompanyContext = (req) =>
  req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN'
    ? undefined
    : req.user.companyId;

const resolveCompanyId = (req) => {
  if (req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') {
    if (!req.body?.companyId) {
      throw { status: 400, message: 'Le super admin doit sélectionner une entreprise.' };
    }
    return req.body.companyId;
  }
  return req.user.companyId;
};

export const createDepartment = async (req, res) => {
  try {
    const data = { ...req.body, companyId: resolveCompanyId(req) };
    res.status(201).json(await departmentService.createDepartment(data));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await departmentService.getDepartments(companyId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await departmentService.getDepartmentById(req.params.id, companyId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    res.json(await departmentService.updateDepartment(req.params.id, req.body, companyId));
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    await departmentService.deleteDepartment(req.params.id, companyId);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};