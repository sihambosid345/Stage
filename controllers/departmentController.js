import * as departmentService from "../services/departmentService.js";

const getCompanyContext = (req) => {
  const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
  return isSuperAdmin ? undefined : req.user?.companyId;
};

const resolveCompanyId = (req) => {
  const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
  
  if (isSuperAdmin) {
    if (!req.body?.companyId) {
      throw { status: 400, message: 'Le super admin doit sélectionner une entreprise.' };
    }
    return req.body.companyId;
  }
  return req.user?.companyId;
};

export const createDepartment = async (req, res) => {
  try {
    const data = { ...req.body, companyId: resolveCompanyId(req) };
    const department = await departmentService.createDepartment(data);
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    
    console.log(`📋 Getting departments - SuperAdmin: ${isSuperAdmin}, CompanyId: ${companyId || 'ALL'}`);
    
    const departments = await departmentService.getDepartments(companyId);
    
    console.log(`✅ Found ${departments.length} departments`);
    res.json(departments);
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les départements par entreprise (pour Super Admin)
export const getDepartmentsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userCompanyId = getCompanyContext(req);
    const isSuperAdmin = req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN';
    
    // Vérifier que l'utilisateur a le droit d'accéder à cette entreprise
    if (!isSuperAdmin && userCompanyId !== companyId) {
      return res.status(403).json({ error: "Accès non autorisé à cette entreprise" });
    }
    
    const departments = await departmentService.getDepartmentsByCompany(companyId);
    res.json(departments);
  } catch (error) {
    console.error('Error getting departments by company:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    const department = await departmentService.getDepartmentById(req.params.id, companyId);
    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    const updated = await departmentService.updateDepartment(req.params.id, req.body, companyId);
    res.json(updated);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const companyId = getCompanyContext(req);
    await departmentService.deleteDepartment(req.params.id, companyId);
    res.json({ message: "Département supprimé avec succès" });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(error.status || 400).json({ error: error.message });
  }
};