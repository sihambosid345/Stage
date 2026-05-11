import { prisma } from "../prismaClient.js";
import { monthlyHoursFromWeekly, STANDARD_WEEKLY_HOURS } from "../utils/payrollHours.js";

const includeRelations = {
  company: {
    select: {
      id: true,
      name: true,
      status: true
    }
  }
};

// Existant
export const getPayrollConfigByCompany = async (companyId) => {
  let config = await prisma.payrollConfig.findUnique({
    where: { companyId },
    include: includeRelations
  });
  
  if (!config) {
    config = await prisma.payrollConfig.create({
      data: {
        companyId,
        regime: "MOROCCO_STANDARD",
        currency: "MAD",
        weeklyHours: STANDARD_WEEKLY_HOURS,
        monthlyHours: monthlyHoursFromWeekly(STANDARD_WEEKLY_HOURS),
        workingDaysPerMonth: 26,
        cnssEnabled: true,
        amoEnabled: true,
        irEnabled: true,
        cimrEnabled: false,
        defaultCnssDeclaredDays: 26
      },
      include: includeRelations
    });
  }
  
  return config;
};

// ✅ NOUVEAU : Récupérer toutes les configurations (pour super admin)
export const getAllPayrollConfigs = async () => {
  return await prisma.payrollConfig.findMany({
    include: {
      company: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const getPayrollConfigById = async (id) => {
  const config = await prisma.payrollConfig.findUnique({
    where: { id },
    include: includeRelations
  });
  if (!config) throw { status: 404, message: "Configuration non trouvée" };
  return config;
};

export const createPayrollConfig = async (data) => {
  return await prisma.payrollConfig.create({
    data,
    include: includeRelations
  });
};

export const updatePayrollConfig = async (companyId, data) => {
  const config = await getPayrollConfigByCompany(companyId);
  return await prisma.payrollConfig.update({
    where: { id: config.id },
    data,
    include: includeRelations
  });
};

// ✅ NOUVEAU : Mettre à jour par ID
export const updatePayrollConfigById = async (id, data) => {
  await getPayrollConfigById(id);
  return await prisma.payrollConfig.update({
    where: { id },
    data,
    include: includeRelations
  });
};

export const upsertPayrollConfig = async (companyId, data) => {
  return await prisma.payrollConfig.upsert({
    where: { companyId },
    update: data,
    create: { companyId, ...data },
    include: includeRelations
  });
};

// ✅ NOUVEAU : Supprimer
export const deletePayrollConfig = async (id) => {
  await getPayrollConfigById(id);
  await prisma.payrollConfig.delete({ where: { id } });
  return { message: "Configuration supprimée" };
};