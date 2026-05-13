// employeeRecurringItemService.js
import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { 
    select: { 
      id: true, 
      firstName: true, 
      lastName: true,
      companyId: true 
    } 
  },
  company: { 
    select: { 
      id: true, 
      name: true 
    } 
  },
  createdBy: { 
    select: { 
      id: true, 
      firstName: true, 
      lastName: true 
    } 
  },
};

export const createRecurringItem = async (data) => {
  try {
    // Validate required fields
    if (!data.employeeId) throw { status: 400, message: "employeeId is required" };
    if (!data.type) throw { status: 400, message: "type is required" };
    if (!data.label) throw { status: 400, message: "label is required" };
    if (!data.effectiveFrom) throw { status: 400, message: "effectiveFrom is required" };
    if (!data.companyId) throw { status: 400, message: "companyId is required" };
    
    // Prepare data for creation
    const createData = {
      companyId: data.companyId,
      employeeId: data.employeeId,
      type: data.type,
      valueType: data.valueType || 'FIXED',
      label: data.label,
      effectiveFrom: new Date(data.effectiveFrom),
      isActive: data.isActive !== undefined ? data.isActive : true,
      isTaxable: data.isTaxable || false,
      isCnssApplicable: data.isCnssApplicable || false,
    };
    
    // Add optional fields
    if (data.amount !== undefined && data.amount > 0) {
      createData.amount = data.amount;
    }
    if (data.percentageValue !== undefined && data.percentageValue > 0) {
      createData.percentageValue = data.percentageValue;
    }
    if (data.effectiveTo) {
      createData.effectiveTo = new Date(data.effectiveTo);
    }
    if (data.notes) {
      createData.notes = data.notes;
    }
    if (data.createdById) {
      createData.createdById = data.createdById;
    }
    
    console.log('Creating recurring item:', createData);
    
    const result = await prisma.employeeRecurringItem.create({
      data: createData,
      include: includeRelations,
    });
    
    return result;
  } catch (error) {
    console.error('Error in createRecurringItem:', error);
    throw { status: 500, message: error.message };
  }
};

export const getRecurringItems = async (companyId) => {
  try {
    const where = companyId ? { companyId } : {};
    
    const items = await prisma.employeeRecurringItem.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    });
    
    return items;
  } catch (error) {
    console.error('Error in getRecurringItems:', error);
    return [];
  }
};

export const getRecurringItemById = async (id, companyId) => {
  try {
    const where = { id };
    if (companyId) where.companyId = companyId;
    
    const item = await prisma.employeeRecurringItem.findFirst({
      where,
      include: includeRelations,
    });
    
    if (!item) throw { status: 404, message: "Recurring item not found" };
    return item;
  } catch (error) {
    console.error('Error in getRecurringItemById:', error);
    throw error;
  }
};

export const getRecurringItemsByEmployee = async (employeeId, companyId) => {
  try {
    const where = { employeeId };
    if (companyId) where.companyId = companyId;
    
    const items = await prisma.employeeRecurringItem.findMany({
      where,
      include: includeRelations,
      orderBy: { effectiveFrom: 'desc' },
    });
    
    return items;
  } catch (error) {
    console.error('Error in getRecurringItemsByEmployee:', error);
    return [];
  }
};

export const updateRecurringItem = async (id, data, companyId) => {
  try {
    await getRecurringItemById(id, companyId);
    
    const updateData = { ...data };
    
    // Convert dates
    if (updateData.effectiveFrom) {
      updateData.effectiveFrom = new Date(updateData.effectiveFrom);
    }
    if (updateData.effectiveTo) {
      updateData.effectiveTo = new Date(updateData.effectiveTo);
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.createdById;
    delete updateData.companyId;
    delete updateData.employeeId;
    
    const result = await prisma.employeeRecurringItem.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    });
    
    return result;
  } catch (error) {
    console.error('Error in updateRecurringItem:', error);
    throw error;
  }
};

export const deleteRecurringItem = async (id, companyId) => {
  try {
    await getRecurringItemById(id, companyId);
    return prisma.employeeRecurringItem.delete({ where: { id } });
  } catch (error) {
    console.error('Error in deleteRecurringItem:', error);
    throw error;
  }
};