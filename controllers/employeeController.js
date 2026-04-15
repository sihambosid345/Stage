import * as employeeService from "../services/employeeService.js";
import * as licenseService from "../services/licenseService.js";

const resolveCompanyId = (req) => {
  if (req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN') {
    if (!req.body?.companyId) {
      throw { status: 400, message: 'Le super admin doit sélectionner une entreprise.' };
    }
    return req.body.companyId;
  }
  return req.user.companyId;
};

export const createEmployee = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const data = { ...req.body, companyId };
    await licenseService.enforceLicenseLimit(companyId, "employees");
    const employee = await employeeService.createEmployee(data);
    res.status(201).json(employee);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    const employees = await employeeService.getEmployees(companyId);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    const employee = await employeeService.getEmployeeById(req.params.id, companyId);
    res.json(employee);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    const updated = await employeeService.updateEmployee(req.params.id, req.body, companyId);
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    await employeeService.deleteEmployee(req.params.id, companyId);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};