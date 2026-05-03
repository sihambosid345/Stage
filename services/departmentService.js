import { prisma } from "../prismaClient.js";

export const createDepartment = async (data) => {
  return await prisma.department.create({ 
    data,
    include: {
      company: { select: { id: true, name: true } }
    }
  });
};

export const getDepartments = async (companyId) => {
  const where = companyId ? { companyId } : {};
  
  return await prisma.department.findMany({ 
    where,
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { positions: true, employees: true } }
    },
    orderBy: { name: "asc" }
  });
};

// Récupérer les départements par entreprise
export const getDepartmentsByCompany = async (companyId) => {
  if (!companyId) return [];
  
  return await prisma.department.findMany({
    where: { companyId },
    include: {
      company: { select: { id: true, name: true } },
      positions: { select: { id: true, name: true } },
      _count: { select: { employees: true } }
    },
    orderBy: { name: "asc" }
  });
};

export const getDepartmentById = async (id, companyId) => {
  const where = companyId ? { id, companyId } : { id };
  const department = await prisma.department.findFirst({ 
    where,
    include: {
      company: { select: { id: true, name: true } },
      positions: { select: { id: true, name: true } }
    }
  });
  
  if (!department) throw { status: 404, message: "Département non trouvé" };
  return department;
};

export const updateDepartment = async (id, data, companyId) => {
  // Vérifier que le département existe et appartient à l'entreprise
  await getDepartmentById(id, companyId);
  
  return await prisma.department.update({ 
    where: { id }, 
    data,
    include: {
      company: { select: { id: true, name: true } }
    }
  });
};

export const deleteDepartment = async (id, companyId) => {
  // Vérifier que le département existe et appartient à l'entreprise
  await getDepartmentById(id, companyId);
  
  // Vérifier que le département n'a pas de postes associés
  const positionsCount = await prisma.position.count({ where: { departmentId: id } });
  if (positionsCount > 0) {
    throw { 
      status: 400, 
      message: `Impossible de supprimer ce département car il contient ${positionsCount} poste(s).` 
    };
  }
  
  // Vérifier que le département n'a pas d'employés associés
  const employeesCount = await prisma.employee.count({ where: { departmentId: id } });
  if (employeesCount > 0) {
    throw { 
      status: 400, 
      message: `Impossible de supprimer ce département car il contient ${employeesCount} employé(s).` 
    };
  }
  
  return await prisma.department.delete({ where: { id } });
};