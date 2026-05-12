import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

const ALLOWED_PERIOD_FIELDS = [
  "companyId", "year", "month", "type",
  "startDate", "endDate", "status", "isLocked", "notes", "createdById",
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
  endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
});

const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const endOfDay   = (date) => { const d = new Date(date); d.setHours(23,59,59,999); return d; };
const addDays    = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

const MONTH_NAMES_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const monthBounds = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0);
  return { startDate: startOfDay(start), endDate: endOfDay(end) };
};

const nextMonthYear = (year, month) =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

const requireCompanyId = (data) => {
  if (!data?.companyId) throw { status: 400, message: "companyId est requis." };
  return data.companyId;
};

/**
 * Vérifie qu'il n'existe pas déjà une période OPEN pour cette entreprise.
 * Retourne les détails de la période existante pour un message d'erreur précis.
 */
const ensureSingleOpenPeriod = async (companyId, exceptId = null) => {
  const where = { companyId, status: "OPEN" };
  if (exceptId) where.id = { not: exceptId };

  const existing = await prisma.payrollPeriod.findFirst({
    where,
    select: { id: true, year: true, month: true, startDate: true, endDate: true },
  });

  if (existing) {
    const monthName = MONTH_NAMES_FR[(existing.month ?? 1) - 1] ?? existing.month;
    throw {
      status: 409,
      code: "OPEN_PERIOD_EXISTS",
      message:
        `Une période OPEN existe déjà pour ${monthName} ${existing.year}. ` +
        `Clôturez-la avant d'en créer une nouvelle.`,
      existingPeriod: existing,
    };
  }
};

/**
 * Vérifie qu'il n'existe pas déjà une période pour cet (année, mois).
 */
const ensureNoDuplicatePeriod = async (companyId, year, month, exceptId = null) => {
  const existing = await prisma.payrollPeriod.findFirst({
    where: {
      companyId,
      year,
      month,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, status: true },
  });

  if (existing) {
    const monthName = MONTH_NAMES_FR[month - 1] ?? month;
    throw {
      status: 409,
      code: "DUPLICATE_PERIOD",
      message:
        `Une période existe déjà pour ${monthName} ${year} ` +
        `(statut : ${existing.status}). Impossible de créer un doublon.`,
      existingPeriod: existing,
    };
  }
};

/**
 * Crée automatiquement la période suivante (statut OPEN si aucune OPEN, sinon CLOSED).
 * Ne fait rien si elle existe déjà.
 */
const ensureNextPeriodExists = async (period, createdById = null) => {
  if (!period?.companyId) return null;

  let nextYear, nextMonth, nextStart, nextEnd;

  if (period.type === "MONTHLY") {
    ({ year: nextYear, month: nextMonth } = nextMonthYear(period.year, period.month));
    ({ startDate: nextStart, endDate: nextEnd } = monthBounds(nextYear, nextMonth));
  } else if (period.type === "WEEKLY") {
    const ns = startOfDay(addDays(period.endDate, 1));
    nextStart = ns; nextEnd = endOfDay(addDays(ns, 6));
    nextYear  = ns.getFullYear(); nextMonth = ns.getMonth() + 1;
  } else if (period.type === "CUSTOM") {
    const dur = Math.max(1,
      Math.round((startOfDay(period.endDate) - startOfDay(period.startDate)) / 86_400_000) + 1
    );
    const ns = startOfDay(addDays(period.endDate, 1));
    nextStart = ns; nextEnd = endOfDay(addDays(ns, dur - 1));
    nextYear  = ns.getFullYear(); nextMonth = ns.getMonth() + 1;
  } else {
    return null;
  }

  // Vérifier si cette période suivante existe déjà
  const exists = await prisma.payrollPeriod.findFirst({
    where: { companyId: period.companyId, year: nextYear, month: nextMonth },
    select: { id: true },
  });
  if (exists) return null;

  // Vérifier s'il y a déjà une OPEN (dans ce cas la suivante sera CLOSED)
  const anyOpen = await prisma.payrollPeriod.findFirst({
    where: { companyId: period.companyId, status: "OPEN" },
    select: { id: true },
  });

  const nextPeriod = await prisma.payrollPeriod.create({
    data: {
      companyId:  period.companyId,
      year:       nextYear,
      month:      nextMonth,
      type:       period.type,
      status:     anyOpen ? "CLOSED" : "OPEN",
      startDate:  nextStart,
      endDate:    nextEnd,
      isLocked:   false,
      ...(createdById ? { createdById } : {}),
    },
    include: includeRelations,
  });

  return nextPeriod;
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export const createPeriod = async (data, userId = null) => {
  const picked = pickPeriodPayload(data);
  const parsed = parseDates(picked);
  const companyId = requireCompanyId(parsed);

  if (!parsed.type) parsed.type = "MONTHLY";
  if (!parsed.year)  parsed.year  = new Date().getFullYear();
  if (!parsed.month) parsed.month = new Date().getMonth() + 1;

  parsed.year  = parseInt(parsed.year, 10);
  parsed.month = parseInt(parsed.month, 10);

  // Pour MONTHLY : toujours caler les dates sur le calendrier
  if (parsed.type === "MONTHLY") {
    const bounds = monthBounds(parsed.year, parsed.month);
    parsed.startDate = bounds.startDate;
    parsed.endDate   = bounds.endDate;
  }

  // 1. Vérifier doublon (même mois/année pour cette entreprise)
  await ensureNoDuplicatePeriod(companyId, parsed.year, parsed.month);

  // 2. Vérifier une seule OPEN par entreprise
  await ensureSingleOpenPeriod(companyId);

  // La nouvelle période est forcée à OPEN
  parsed.status = "OPEN";
  if (userId) parsed.createdById = userId;

  const created = await prisma.payrollPeriod.create({
    data: parsed,
    include: includeRelations,
  });

  // 3. Créer automatiquement la période suivante (statut CLOSED, prête à ouvrir)
  await ensureNextPeriodExists(created, userId);

  return created;
};

export const getPeriods = async (companyId = null) => {
  const where = companyId ? { companyId } : {};
  return await prisma.payrollPeriod.findMany({
    where,
    include: includeRelations,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
};

export const getPeriodById = async (id) => {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!period) throw { status: 404, message: "Période de paie introuvable." };
  return period;
};

/**
 * Retourne la période OPEN d'une entreprise, ou null si aucune.
 */
export const getOpenPeriod = async (companyId) => {
  if (!companyId) throw { status: 400, message: "companyId est requis." };
  return await prisma.payrollPeriod.findFirst({
    where: { companyId, status: "OPEN" },
    include: includeRelations,
  });
};

export const updatePeriod = async (id, data) => {
  const existing = await getPeriodById(id);
  const picked = pickPeriodPayload(data);
  const parsed = parseDates(picked);

  const type  = parsed.type  ?? existing.type;
  const year  = parsed.year  ? parseInt(parsed.year, 10)  : existing.year;
  const month = parsed.month ? parseInt(parsed.month, 10) : existing.month;

  if (type === "MONTHLY") {
    const bounds = monthBounds(year, month);
    parsed.startDate = bounds.startDate;
    parsed.endDate   = bounds.endDate;
    parsed.year  = year;
    parsed.month = month;
  }

  // Si on change d'année/mois → vérifier doublon
  if ((parsed.year && parsed.year !== existing.year) ||
      (parsed.month && parsed.month !== existing.month)) {
    await ensureNoDuplicatePeriod(existing.companyId, year, month, id);
  }

  // Si on passe à OPEN → vérifier unicité
  if (parsed.status === "OPEN" && existing.status !== "OPEN") {
    await ensureSingleOpenPeriod(existing.companyId, id);
  }

  return await prisma.payrollPeriod.update({
    where: { id },
    data: parsed,
    include: includeRelations,
  });
};

export const deletePeriod = async (id) => {
  const existing = await getPeriodById(id);
  if (existing.status === "OPEN") {
    throw {
      status: 400,
      code: "CANNOT_DELETE_OPEN",
      message: "Impossible de supprimer une période OPEN. Clôturez-la d'abord.",
    };
  }
  await prisma.payrollPeriod.delete({ where: { id } });
};

/**
 * Clôture la période courante et ouvre automatiquement la suivante.
 * Crée la période suivante si elle n'existe pas encore.
 */
export const closePeriodAndOpenNext = async (id, userId = null) => {
  const existing = await getPeriodById(id);

  if (existing.status !== "OPEN") {
    throw {
      status: 400,
      code: "NOT_OPEN",
      message: `Cette période est déjà en statut "${existing.status}". Seule une période OPEN peut être clôturée.`,
    };
  }

  // Clôturer la période courante
  const closed = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "CLOSED" },
    include: includeRelations,
  });

  // S'assurer que la suivante existe
  const nextCreated = await ensureNextPeriodExists(existing, userId);

  // Trouver la période suivante et l'ouvrir
  let nextPeriod = nextCreated;

  if (!nextPeriod) {
    if (existing.type === "MONTHLY") {
      const { year: ny, month: nm } = nextMonthYear(existing.year, existing.month);
      nextPeriod = await prisma.payrollPeriod.findFirst({
        where: { companyId: existing.companyId, year: ny, month: nm },
        include: includeRelations,
      });
    } else {
      nextPeriod = await prisma.payrollPeriod.findFirst({
        where: {
          companyId: existing.companyId,
          startDate: { gt: existing.endDate },
          status: { not: "OPEN" },
        },
        orderBy: { startDate: "asc" },
        include: includeRelations,
      });
    }
  }

  if (nextPeriod && nextPeriod.status !== "OPEN") {
    // Vérification de sécurité : aucune autre OPEN ne doit exister
    await ensureSingleOpenPeriod(existing.companyId, nextPeriod.id);
    nextPeriod = await prisma.payrollPeriod.update({
      where: { id: nextPeriod.id },
      data: { status: "OPEN" },
      include: includeRelations,
    });
  }

  return {
    closed,
    opened: nextPeriod ?? null,
    message: nextPeriod
      ? `Période ${MONTH_NAMES_FR[(existing.month ?? 1) - 1]} ${existing.year} clôturée. ` +
        `Période ${MONTH_NAMES_FR[(nextPeriod.month ?? 1) - 1]} ${nextPeriod.year} ouverte automatiquement.`
      : `Période ${MONTH_NAMES_FR[(existing.month ?? 1) - 1]} ${existing.year} clôturée.`,
  };
};