import * as auditLogService from "../services/auditLogService.js";

const nonAuditPaths = [
  "/api/audit-logs",
  "/api/audit-logs/",
  "/audit-logs",
  "/audit-logs/",
];

const getPathEntityType = (path) => {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return "UNKNOWN";
  const candidate = segments[0];
  if (candidate === "payroll") {
    return segments[1]?.toUpperCase() || "PAYROLL";
  }
  return candidate.toUpperCase();
};

const getEntityId = (req) => {
  if (req.params?.id) return String(req.params.id);
  if (req.params?.runId) return String(req.params.runId);
  if (req.params?.payslipId) return String(req.params.payslipId);
  if (req.params?.employeeId) return String(req.params.employeeId);
  if (req.params?.companyId) return String(req.params.companyId);
  return null;
};

const getRequestCompanyId = (req) => {
  if (req.user?.companyId) return req.user.companyId;
  if (req.body?.companyId) return req.body.companyId;
  if (req.query?.companyId) return req.query.companyId;
  if (req.params?.companyId) return req.params.companyId;
  return null;
};

const buildDescription = (req) => {
  const method = req.method.toUpperCase();
  return `${method} ${req.originalUrl}`;
};

export const auditLogger = async (req, _res, next) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return next();
  }

  if (nonAuditPaths.some((path) => req.originalUrl.startsWith(path))) {
    return next();
  }

  const action = `${method}_${getPathEntityType(req.path)}`;
  const entityType = getPathEntityType(req.path);
  const entityId = getEntityId(req);
  const companyId = getRequestCompanyId(req);

  try {
    await auditLogService.logAction({
      req,
      action,
      entityType,
      entityId,
      companyId,
      description: buildDescription(req),
      metadata: {
        body: req.body && Object.keys(req.body).length ? req.body : undefined,
        query: req.query && Object.keys(req.query).length ? req.query : undefined,
      }
    });
  } catch (error) {
    console.error("Audit logging failed:", error.message || error);
  }

  next();
};
