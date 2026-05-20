import * as employeeService from "../services/employeeService.js";
import * as licenseService from "../services/licenseService.js";
import * as auditLogService from "../services/auditLogService.js";

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
    await auditLogService.logAction({
      req,
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      companyId: employee.companyId,
      description: `Employé ${employee.firstName} ${employee.lastName} créé`,
      metadata: { employeeCode: employee.employeeCode }
    });
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

export const getEmployeesByPosition = async (req, res) => {
  try {
    const { departmentId } = req.params;
    console.log('📋 Fetching employees for position:', positionId);
    
    const employees = await employeeService.getEmployeesByPosition(positionId);
    
    console.log(`✅ Found ${positions.length} employees`);
    res.json(employees);
  } catch (error) {
    console.error('Error getting employees by position:', error);
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
    await auditLogService.logAction({
      req,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: updated.id,
      companyId: updated.companyId,
      description: `Employé ${updated.firstName} ${updated.lastName} mis à jour`,
      metadata: { changes: req.body }
    });
    res.json(updated);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const companyId = req.user.isSuperAdmin || req.user.role === 'SUPER_ADMIN' ? undefined : req.user.companyId;
    const targetEmployee = await employeeService.getEmployeeById(req.params.id, companyId);
    await employeeService.deleteEmployee(req.params.id, companyId);
    await auditLogService.logAction({
      req,
      action: 'DELETE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: req.params.id,
      companyId: targetEmployee.companyId || companyId,
      description: `Employé ${targetEmployee.firstName} ${targetEmployee.lastName} supprimé`,
      metadata: { targetEmployeeId: req.params.id }
    });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};