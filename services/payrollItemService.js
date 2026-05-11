import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  payrollRun: { 
    select: { 
      id: true, 
      runNumber: true, 
      status: true,
      companyId: true  
    } 
  },
};

export const createItem = async (data) => {
  const { companyId, payrollRunId, employeeId, ...rest } = data;
  
  console.log('📥 Service createItem - Reçu:', { companyId, payrollRunId, employeeId });
  
  // ✅⭐⭐⭐ CORRECTION CRITIQUE ⭐⭐⭐
  let finalCompanyId = companyId;
  
  if (!finalCompanyId) {
    console.log('⚠️ companyId est null, récupération automatique...');
    
    // Méthode 1: Récupérer depuis le PayrollRun
    if (payrollRunId) {
      const run = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { companyId: true }
      });
      
      console.log('📦 Run trouvé:', run);
      
      if (run?.companyId) {
        finalCompanyId = run.companyId;
        console.log('✅ CompanyId récupéré du run:', finalCompanyId);
      }
    }
    
    // Méthode 2: Récupérer depuis l'Employee
    if (!finalCompanyId && employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true }
      });
      
      console.log('📦 Employee trouvé:', employee);
      
      if (employee?.companyId) {
        finalCompanyId = employee.companyId;
        console.log('✅ CompanyId récupéré de l\'employé:', finalCompanyId);
      }
    }
    
    // Méthode 3: Récupérer depuis la période du run
    if (!finalCompanyId && payrollRunId) {
      const runWithPeriod = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { 
          payrollPeriod: {
            select: { companyId: true }
          }
        }
      });
      
      console.log('📦 Période trouvée:', runWithPeriod?.payrollPeriod);
      
      if (runWithPeriod?.payrollPeriod?.companyId) {
        finalCompanyId = runWithPeriod.payrollPeriod.companyId;
        console.log('✅ CompanyId récupéré de la période:', finalCompanyId);
      }
    }
  }
  
  // ✅ Vérification finale
  if (!finalCompanyId) {
    console.error('❌ Impossible de déterminer le companyId');
    throw { 
      status: 400, 
      message: 'Impossible de déterminer l\'entreprise. Vérifiez le PayrollRun, l\'Employee et la PayrollPeriod.' 
    };
  }
  
  console.log('✅ CompanyId final:', finalCompanyId);
  
  // ✅ Créer avec le bon companyId
  return await prisma.payrollItem.create({
    data: {
      ...rest,
      companyId: finalCompanyId,  // GARANTI non-null
      payrollRunId,
      employeeId,
    },
    include: includeRelations,
  });
};

export const getItems = async () => {
  const items = await prisma.payrollItem.findMany({ 
    include: includeRelations,
    orderBy: { createdAt: "desc" }
  });
  
  return items.map(item => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null
  }));
};

export const getItemById = async (id) => {
  const item = await prisma.payrollItem.findUnique({
    where: { id },
    include: includeRelations,
  });
  
  if (!item) throw { status: 404, message: "Payroll item not found" };
  
  return {
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null
  };
};

export const getItemsByRun = async (payrollRunId) => {
  const items = await prisma.payrollItem.findMany({
    where: { payrollRunId },
    include: includeRelations,
    orderBy: { sortOrder: "asc" },
  });
  
  return items.map(item => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null
  }));
};

export const getItemsByEmployee = async (employeeId) => {
  const items = await prisma.payrollItem.findMany({
    where: { employeeId },
    include: includeRelations,
  });
  
  return items.map(item => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null
  }));
};

export const updateItem = async (id, data) => {
  await getItemById(id);
  return await prisma.payrollItem.update({ 
    where: { id }, 
    data, 
    include: includeRelations 
  });
};

export const deleteItem = async (id) => {
  await getItemById(id);
  await prisma.payrollItem.delete({ where: { id } });
};