import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

/** Champs acceptes par Prisma (evite erreurs si le body contient des cles en trop). */
const ALLOWED_PERIOD_FIELDS = [
  "companyId",
  "year",
  "month",
  "type",
  "startDate",
  "endDate",
  "status",
  "isLocked",
  "notes",
  "createdById",
];

const pickPeriodPayload = (data) => {
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const key of ALLOWED_PERIOD_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
      out[key] = data[key];
    }
  }
  return out;
};

const parseDates = (data) => ({
  ...data,
  startDate: data.startDate ? new Date(data.startDate) : undefined,
  endDate: data.endDate ? new Date(data.endDate) : undefined,
});

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const monthBounds = (year, month) => {
  // month: 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { startDate: startOfDay(start), endDate: endOfDay(end) };
};

const nextMonthYear = (year, month) => {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
};

const requireCompanyId = (data) => {
  if (!data?.companyId) throw { status: 400, message: "companyId is required" };
  return data.companyId;
};

const ensureSingleOpenPeriod = async (companyId, exceptId) => {
  const where = { companyId, status: "OPEN" };
  if (exceptId) where.id = { not: exceptId };
  const existing = await prisma.payrollPeriod.findFirst({ where, select: { id: true } });
  if (existing) {
    throw { status: 400, message: "Une seule période OPEN est autorisée par entreprise." };
  }
};

const ensureNextPeriodExists = async (period, createdById) => {
  if (!period?.companyId || !period?.startDate || !period?.endDate) return;

  let next;
  if (period.type === "MONTHLY") {
    const { year, month } = nextMonthYear(period.year, period.month);
    const bounds = monthBounds(year, month);
    next = {
      companyId: period.companyId,
      year,
      month,
      type: period.type,
      status: "CLOSED", // préparée à l'avance (1 seule OPEN)
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      createdById,
    };
  } else if (period.type === "WEEKLY") {
    const nextStart = startOfDay(addDays(period.endDate, 1));
    const nextEnd = endOfDay(addDays(nextStart, 6));
    next = {
      companyId: period.companyId,
      year: nextStart.getFullYear(),
      month: nextStart.getMonth() + 1,
      type: period.type,
      status: "CLOSED",
      startDate: nextStart,
      endDate: nextEnd,
      createdById,
    };
  } else if (period.type === "CUSTOM") {
    const durationDays = Math.max(
      1,
      Math.round((startOfDay(period.endDate) - startOfDay(period.startDate)) / (24 * 60 * 60 * 1000)) + 1
    );
    const nextStart = startOfDay(addDays(period.endDate, 1));
    const nextEnd = endOfDay(addDays(nextStart, durationDays - 1));
    next = {
      companyId: period.companyId,
      year: nextStart.getFullYear(),
      month: nextStart.getMonth() + 1,
      type: period.type,
      status: "CLOSED",
      startDate: nextStart,
      endDate: nextEnd,
      createdById,
    };
  }

  if (!next) return;

  const exists = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId: next.companyId, year: next.year, month: next.month } },
    select: { id: true },
  });
  if (!exists) {
    await prisma.payrollPeriod.create({ data: next });
  }
};

export const createPeriod = async (data) => {
  const picked = pickPeriodPayload(data);
  const parsed = parseDates(picked);
  const companyId = requireCompanyId(parsed);

  if (!parsed.type) parsed.type = "MONTHLY";

  // Mensuel : toujours caler debut/fin sur le mois (annee + mois), ignore dates incoherentes du formulaire
  if (parsed.type === "MONTHLY" && parsed.year && parsed.month) {
    const bounds = monthBounds(parsed.year, parsed.month);
    parsed.startDate = bounds.startDate;
    parsed.endDate = bounds.endDate;
  }

  // Règle stricte : une seule période OPEN par entreprise
  // Si aucune période OPEN n'existe → on force la nouvelle en OPEN
  // Si une période OPEN existe déjà → erreur
  await ensureSingleOpenPeriod(companyId);

  // Forcer le statut à OPEN (on ne peut pas créer une période avec un autre statut)
  parsed.status = "OPEN";

  return await prisma.payrollPeriod.create({
    data: parsed,
    include: includeRelations,
  });
};

export const getPeriods = async () => {
  return await prisma.payrollPeriod.findMany({
    include: includeRelations,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
};

export const getPeriodById = async (id) => {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!period) throw { status: 404, message: "Payroll period not found" };
  return period;
};

export const updatePeriod = async (id, data) => {
  const existing = await getPeriodById(id);
  const picked = pickPeriodPayload(data);
  const parsed = parseDates(picked);

  const type = parsed.type ?? existing.type;
  if (type === "MONTHLY") {
    const year = parsed.year ?? existing.year;
    const month = parsed.month ?? existing.month;
    if (year && month) {
      const bounds = monthBounds(year, month);
      parsed.startDate = bounds.startDate;
      parsed.endDate = bounds.endDate;
    }
  }

  // Enforce single OPEN if status becomes OPEN
  if (parsed.status === "OPEN" && existing.status !== "OPEN") {
    await ensureSingleOpenPeriod(existing.companyId, id);
  }

  return await prisma.payrollPeriod.update({
    where: { id },
    data: parsed, // ✅ fix + rules
    include: includeRelations,
  });
};

export const deletePeriod = async (id) => {
  await getPeriodById(id);
  await prisma.payrollPeriod.delete({ where: { id } });
};

export const closePeriodAndOpenNext = async (id, userId) => {
  const existing = await getPeriodById(id);

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "CLOSED" },
    include: includeRelations,
  });

  // Ensure a next period exists (prepared) and open it if none open.
  await ensureNextPeriodExists(existing, userId);

  const anyOpen = await prisma.payrollPeriod.findFirst({
    where: { companyId: existing.companyId, status: "OPEN" },
    select: { id: true },
  });

  if (!anyOpen) {
    // open next month/week/custom period
    let openTarget;
    if (existing.type === "MONTHLY") {
      const { year, month } = nextMonthYear(existing.year, existing.month);
      openTarget = await prisma.payrollPeriod.findUnique({
        where: { companyId_year_month: { companyId: existing.companyId, year, month } },
      });
    } else {
      openTarget = await prisma.payrollPeriod.findFirst({
        where: {
          companyId: existing.companyId,
          startDate: { gt: existing.endDate },
        },
        orderBy: { startDate: "asc" },
      });
    }

    if (openTarget) {
      await ensureSingleOpenPeriod(existing.companyId, openTarget.id);
      await prisma.payrollPeriod.update({
        where: { id: openTarget.id },
        data: { status: "OPEN" },
      });
    }
  }

  return updated;
};