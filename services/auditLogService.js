import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
};

const getRequestIp = (req) => {
  if (!req) return null;
  return req.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim()
    || req.ip
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || null;
};

const buildAuditLogData = ({ req, action, entityType, entityId, description, metadata = {}, companyId }) => {
  const resolvedCompanyId = companyId || req?.body?.companyId || req?.user?.companyId;
  if (!resolvedCompanyId) {
    throw { status: 400, message: 'CompanyId is required for audit log.' };
  }

  return {
    companyId: resolvedCompanyId,
    userId: req?.user?.id ?? metadata?.userId ?? null,
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    description,
    metadata: {
      ...metadata,
      ipAddress: getRequestIp(req),
    },
  };
};

export const createLog = async (data) => {
  return await prisma.auditLog.create({ data, include: includeRelations });
};

export const logAction = async ({ req, action, entityType, entityId, description, metadata, companyId }) => {
  const data = buildAuditLogData({ req, action, entityType, entityId, description, metadata, companyId });
  return await createLog(data);
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