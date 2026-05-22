import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  payrollRun: {
    select: {
      id: true,
      runNumber: true,
      status: true,
      companyId: true,
      payrollPeriod: { select: { id: true, year: true, month: true, startDate: true, endDate: true, status: true } },
    },
  },
};

export const createItem = async (data) => {
  const { companyId, payrollRunId, employeeId, ...rest } = data;

  console.log("📥 Service createItem - Reçu:", { companyId, payrollRunId, employeeId });

  let finalCompanyId = companyId;

  if (!finalCompanyId) {
    console.log("⚠️ companyId est null, récupération automatique...");

    // Méthode 1 : depuis le PayrollRun
    if (payrollRunId) {
      const run = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { companyId: true },
      });
      if (run?.companyId) {
        finalCompanyId = run.companyId;
        console.log("✅ CompanyId récupéré du run:", finalCompanyId);
      }
    }

    // Méthode 2 : depuis l'Employee
    if (!finalCompanyId && employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      });
      if (employee?.companyId) {
        finalCompanyId = employee.companyId;
        console.log("✅ CompanyId récupéré de l'employé:", finalCompanyId);
      }
    }

    // Méthode 3 : depuis la période du run
    if (!finalCompanyId && payrollRunId) {
      const runWithPeriod = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        select: { payrollPeriod: { select: { companyId: true } } },
      });
      if (runWithPeriod?.payrollPeriod?.companyId) {
        finalCompanyId = runWithPeriod.payrollPeriod.companyId;
        console.log("✅ CompanyId récupéré de la période:", finalCompanyId);
      }
    }
  }

  if (!finalCompanyId) {
    throw {
      status: 400,
      message: "Impossible de déterminer l'entreprise. Vérifiez le PayrollRun, l'Employee et la PayrollPeriod.",
    };
  }

  console.log("✅ CompanyId final:", finalCompanyId);

  const createData = {
    ...rest,
    companyId: finalCompanyId,
    payrollRunId,
    employeeId,
  };
  if (rest.amoApplicable === undefined) {
    createData.amoApplicable = false;
  }

  return await prisma.payrollItem.create({ data: createData, include: includeRelations });
};

/**
 * SUPER_ADMIN sans companyId  → tous les items
 * SUPER_ADMIN avec companyId  → items de cette entreprise
 * Admin / User                → companyId obligatoire → leurs items uniquement
 */
export const getItems = async (companyId = null) => {
  const items = await prisma.payrollItem.findMany({
    where: companyId ? { companyId } : undefined,
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null,
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
    companyId: item.companyId || item.payrollRun?.companyId || null,
  };
};

export const getItemsByRun = async (payrollRunId) => {
  const items = await prisma.payrollItem.findMany({
    where: { payrollRunId },
    include: includeRelations,
    orderBy: { sortOrder: "asc" },
  });

  return items.map((item) => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null,
  }));
};

export const getItemsByEmployee = async (employeeId) => {
  const items = await prisma.payrollItem.findMany({
    where: { employeeId },
    include: includeRelations,
  });

  return items.map((item) => ({
    ...item,
    companyId: item.companyId || item.payrollRun?.companyId || null,
  }));
};

export const updateItem = async (id, data) => {
  await getItemById(id);
  return await prisma.payrollItem.update({ where: { id }, data, include: includeRelations });
};

export const deleteItem = async (id) => {
  await getItemById(id);
  await prisma.payrollItem.delete({ where: { id } });
};