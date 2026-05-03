import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { 
    select: { 
      id: true, 
      firstName: true, 
      lastName: true,
      cin: true,
      email: true,
      phone: true,
      employeeCode: true,
      companyId: true,
      departmentId: true,
      positionId: true
    } 
  },
  company: { 
    select: { 
      id: true, 
      name: true 
    } 
  },
};

const parseDates = (data) => ({
  ...data,
  startDate: data.startDate ? new Date(data.startDate) : undefined,
  endDate: data.endDate ? new Date(data.endDate) : undefined,
});

/**
 * Crée un nouveau contrat
 */
export const createContract = async (data) => {
  try {
    return await prisma.employeeContract.create({
      data: parseDates(data),
      include: includeRelations,
    });
  } catch (error) {
    console.error('Create contract service error:', error);
    throw { status: 400, message: error.message || "Erreur lors de la création du contrat" };
  }
};

/**
 * Récupère tous les contrats (avec filtre optionnel par companyId)
 * @param {string|undefined} companyId - undefined pour super admin (tous les contrats)
 */
export const getContracts = async (companyId) => {
  try {
    const where = {};
    
    // Only filter by company if companyId is provided
    if (companyId !== undefined && companyId !== null) {
      where.companyId = companyId;
    }
    
    return await prisma.employeeContract.findMany({ 
      where,
      include: includeRelations 
    });
  } catch (error) {
    console.error('Get contracts service error:', error);
    throw { status: 500, message: error.message || "Erreur lors de la récupération des contrats" };
  }
};

/**
 * Récupère un contrat par son ID (avec filtre optionnel par companyId)
 * @param {string} id - ID du contrat
 * @param {string|undefined} companyId - undefined pour super admin (pas de filtre entreprise)
 */
export const getContractById = async (id, companyId) => {
  try {
    const where = { id };
    
    // Only filter by company if companyId is provided
    if (companyId !== undefined && companyId !== null) {
      where.companyId = companyId;
    }
    
    const contract = await prisma.employeeContract.findUnique({
      where,
      include: includeRelations,
    });
    
    if (!contract) {
      throw { status: 404, message: "Contrat introuvable" };
    }
    
    return contract;
  } catch (error) {
    if (error.status) throw error;
    console.error('Get contract by ID service error:', error);
    throw { status: 500, message: error.message || "Erreur lors de la récupération du contrat" };
  }
};

/**
 * Récupère les contrats d'un employé (avec filtre optionnel par companyId)
 */
export const getContractsByEmployee = async (employeeId, companyId) => {
  try {
    const where = { employeeId };
    
    // Only filter by company if companyId is provided
    if (companyId !== undefined && companyId !== null) {
      where.companyId = companyId;
    }
    
    return await prisma.employeeContract.findMany({
      where,
      include: includeRelations,
    });
  } catch (error) {
    console.error('Get contracts by employee service error:', error);
    throw { status: 500, message: error.message || "Erreur lors de la récupération des contrats" };
  }
};

/**
 * Met à jour un contrat
 */
export const updateContract = async (id, data, companyId) => {
  try {
    // First verify the contract exists and belongs to the right company
    await getContractById(id, companyId);
    
    return await prisma.employeeContract.update({
      where: { id },
      data: parseDates(data),
      include: includeRelations,
    });
  } catch (error) {
    if (error.status) throw error;
    console.error('Update contract service error:', error);
    throw { status: 400, message: error.message || "Erreur lors de la mise à jour du contrat" };
  }
};

/**
 * Supprime un contrat
 */
export const deleteContract = async (id, companyId) => {
  try {
    // First verify the contract exists and belongs to the right company
    await getContractById(id, companyId);
    
    await prisma.employeeContract.delete({ where: { id } });
  } catch (error) {
    if (error.status) throw error;
    console.error('Delete contract service error:', error);
    throw { status: 400, message: error.message || "Erreur lors de la suppression du contrat" };
  }
};