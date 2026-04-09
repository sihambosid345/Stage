import prisma from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
};

export const createLog = async (data) => {
  return await prisma.auditLog.create({ data, include: includeRelations });
};

export const getLogs = async () => {
  return await prisma.auditLog.findMany({
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const getLogById = async (id) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!log) throw { status: 404, message: "Audit log not found" };
  return log;
};

export const getLogsByCompany = async (companyId) => {
  return await prisma.auditLog.findMany({
    where: { companyId },
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });
};

export const deleteLog = async (id) => {
  await getLogById(id);
  await prisma.auditLog.delete({ where: { id } });
};