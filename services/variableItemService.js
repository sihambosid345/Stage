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

const parseDates = (data) => {
  const result = { ...data };
  
  if (data.effectiveDate) {
    const date = new Date(data.effectiveDate);
    if (isNaN(date.getTime())) {
      throw { status: 400, message: "Invalid effectiveDate format" };
    }
    result.effectiveDate = date;
  }
  
  // Remove undefined values
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  
  return result;
};

export const createVariableItem = async (data) => {
  try {
    // Validate required fields
    if (!data.employeeId) throw { status: 400, message: "employeeId is required" };
    if (!data.type) throw { status: 400, message: "type is required" };
    if (!data.label) throw { status: 400, message: "label is required" };
    if (!data.effectiveDate) throw { status: 400, message: "effectiveDate is required" };
    if (!data.amount || data.amount <= 0) throw { status: 400, message: "amount must be greater than 0" };
    
    // Get employee with their company
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { companyId: true }
    });
    
    if (!employee) {
      throw { status: 404, message: "Employee not found" };
    }
    
    if (!employee.companyId) {
      throw { status: 400, message: "Employee has no associated company" };
    }
    
    // Prepare data for creation
    const createData = {
      employeeId: data.employeeId,
      companyId: employee.companyId,
      type: data.type,
      valueType: data.valueType || 'FIXED',
      label: data.label,
      amount: data.amount,
      effectiveDate: new Date(data.effectiveDate),
      status: data.status || 'PENDING',
    };
    
    // Add optional fields
    if (data.payrollPeriodId) {
      createData.payrollPeriodId = data.payrollPeriodId;
    }
    if (data.notes) {
      createData.notes = data.notes;
    }
    if (data.createdById) {
      createData.createdById = data.createdById;
    }
    
    console.log('Creating variable item:', createData);
    
    const result = await prisma.variableItem.create({
      data: createData,
      include: includeRelations,
    });
    
    return result;
  } catch (error) {
    console.error('Error in createVariableItem:', error);
    throw { status: error.status || 500, message: error.message };
  }
};

export const getVariableItems = async (companyId) => {
  try {
    const where = companyId ? { companyId } : {};
    
    const items = await prisma.variableItem.findMany({
      where,
      include: includeRelations,
      orderBy: { effectiveDate: "desc" }
    });
    
    return items;
  } catch (error) {
    console.error('Error in getVariableItems:', error);
    return [];
  }
};

export const getVariableItemById = async (id, companyId) => {
  try {
    const where = { id };
    if (companyId) where.companyId = companyId;
    
    const item = await prisma.variableItem.findFirst({
      where,
      include: includeRelations,
    });
    
    if (!item) throw { status: 404, message: "Variable item not found" };
    return item;
  } catch (error) {
    console.error('Error in getVariableItemById:', error);
    throw error;
  }
};

export const getVariableItemsByEmployee = async (employeeId, companyId) => {
  try {
    const where = { employeeId };
    if (companyId) where.companyId = companyId;
    
    const items = await prisma.variableItem.findMany({
      where,
      include: includeRelations,
      orderBy: { effectiveDate: "desc" },
    });
    
    return items;
  } catch (error) {
    console.error('Error in getVariableItemsByEmployee:', error);
    return [];
  }
};

export const updateVariableItem = async (id, data, companyId) => {
  try {
    // Verify the item exists and belongs to the company
    await getVariableItemById(id, companyId);
    
    const updateData = { ...data };
    
    // Convert date if present
    if (updateData.effectiveDate) {
      updateData.effectiveDate = new Date(updateData.effectiveDate);
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.companyId;
    delete updateData.employeeId;
    
    const result = await prisma.variableItem.update({
      where: { id },
      data: updateData,
      include: includeRelations,
    });
    
    return result;
  } catch (error) {
    console.error('Error in updateVariableItem:', error);
    throw error;
  }
};

export const deleteVariableItem = async (id, companyId) => {
  try {
    await getVariableItemById(id, companyId);
    return await prisma.variableItem.delete({ where: { id } });
  } catch (error) {
    console.error('Error in deleteVariableItem:', error);
    throw error;
  }
};