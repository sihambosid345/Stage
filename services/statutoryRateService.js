/**
 * Service : StatutoryRate & TaxBracket
 * Gestion des taux légaux et du barème IR depuis la base de données.
 * Remplace toutes les constantes hardcodées du moteur de paie.
 */

import { prisma } from "../prismaClient.js";

// ─────────────────────────────────────────────────────────────────────────────
// STATUTORY RATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le taux actif d'un code donné à une date donnée.
 * Priorité : taux entreprise (companyId) > taux national (null).
 */
export const getCurrentRate = async (code, effectiveDate = new Date(), companyId = null) => {
  const rows = await prisma.statutoryRate.findMany({
    where: {
      code,
      OR: [{ companyId }, { companyId: null }],
      effectiveFrom: { lte: effectiveDate },
      AND: [
        {
          OR: [
            { effectiveTo: { gte: effectiveDate } },
            { effectiveTo: null },
          ],
        },
      ],
      isActive: true,
    },
    orderBy: [
      { companyId: "desc" }, // non-null en premier = taux entreprise prioritaire
      { effectiveFrom: "desc" },
    ],
    take: 1,
  });
  return rows[0] ?? null;
};

/**
 * Récupère tous les taux actifs pour une entreprise (inclut les nationaux).
 */
export const getAllRates = async (companyId = null) => {
  return await prisma.statutoryRate.findMany({
    where: {
      OR: [{ companyId }, { companyId: null }],
      isActive: true,
    },
    orderBy: [{ code: "asc" }, { effectiveFrom: "desc" }],
  });
};

/**
 * Récupère les taux CNSS/AMO pour une date donnée.
 */
export const getCnssRates = async (effectiveDate = new Date(), companyId = null) => {
  const codes = ["CNSS_EMPLOYEE", "CNSS_EMPLOYER", "AMO_EMPLOYEE", "AMO_EMPLOYER"];
  const rates = await Promise.all(codes.map((code) => getCurrentRate(code, effectiveDate, companyId)));
  return Object.fromEntries(codes.map((code, i) => [code, rates[i]]));
};

/**
 * Crée un nouveau taux statutaire.
 */
export const createRate = async (data) => {
  return await prisma.statutoryRate.create({ data });
};

/**
 * Met à jour un taux statutaire existant.
 */
export const updateRate = async (id, data) => {
  const existing = await prisma.statutoryRate.findUnique({ where: { id } });
  if (!existing) throw { status: 404, message: "Taux statutaire introuvable" };
  return await prisma.statutoryRate.update({ where: { id }, data });
};

/**
 * Désactive (soft delete) un taux statutaire.
 */
export const deactivateRate = async (id) => {
  const existing = await prisma.statutoryRate.findUnique({ where: { id } });
  if (!existing) throw { status: 404, message: "Taux statutaire introuvable" };
  return await prisma.statutoryRate.update({ where: { id }, data: { isActive: false, effectiveTo: new Date() } });
};

// ─────────────────────────────────────────────────────────────────────────────
// TAX BRACKETS (Barème IR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère le barème IR actif pour une date et entreprise données.
 * Retourne les tranches en montants MENSUELS (annuel / 12).
 */
export const getActiveTaxBrackets = async (
  effectiveDate = new Date(),
  companyId = null,
  taxCode = "IR_SALAIRE"
) => {
  const rows = await prisma.taxBracket.findMany({
    where: {
      taxCode,
      OR: [{ companyId }, { companyId: null }],
      effectiveFrom: { lte: effectiveDate },
      AND: [
        {
          OR: [
            { effectiveTo: { gte: effectiveDate } },
            { effectiveTo: null },
          ],
        },
      ],
      isActive: true,
    },
    orderBy: [
      { companyId: "desc" }, // entreprise prioritaire
      { annualFrom: "asc" },
    ],
  });

  if (!rows.length) {
    throw new Error(
      `Aucun barème IR "${taxCode}" actif pour la date ${effectiveDate.toISOString().slice(0, 10)}. ` +
        "Exécutez le seed SQL ou créez les tranches via l'interface."
    );
  }

  // Déduplique par tranche (priorité entreprise > national)
  const seen = new Set();
  const deduplicated = rows.filter((r) => {
    const key = `${r.annualFrom}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Convertit en montants mensuels
  return deduplicated.map((b) => ({
    id: b.id,
    min: Math.round((Number(b.annualFrom) / 12) * 100) / 100,
    max: b.annualTo != null ? Math.round((Number(b.annualTo) / 12) * 100) / 100 : Infinity,
    annualFrom: Number(b.annualFrom),
    annualTo: b.annualTo != null ? Number(b.annualTo) : null,
    rate: Number(b.rate),
    deduction: Math.round((Number(b.deductionAmount) / 12) * 100) / 100,
    deductionAnnual: Number(b.deductionAmount),
  }));
};

/**
 * Récupère toutes les tranches IR (pour affichage back-office).
 */
export const getAllTaxBrackets = async (companyId = null, taxCode = "IR_SALAIRE") => {
  return await prisma.taxBracket.findMany({
    where: {
      taxCode,
      OR: [{ companyId }, { companyId: null }],
      isActive: true,
    },
    orderBy: [{ annualFrom: "asc" }],
  });
};

/**
 * Crée une nouvelle tranche IR.
 */
export const createTaxBracket = async (data) => {
  return await prisma.taxBracket.create({ data });
};

/**
 * Met à jour une tranche IR.
 */
export const updateTaxBracket = async (id, data) => {
  const existing = await prisma.taxBracket.findUnique({ where: { id } });
  if (!existing) throw { status: 404, message: "Tranche IR introuvable" };
  return await prisma.taxBracket.update({ where: { id }, data });
};

/**
 * Désactive une tranche IR.
 */
export const deactivateTaxBracket = async (id) => {
  const existing = await prisma.taxBracket.findUnique({ where: { id } });
  if (!existing) throw { status: 404, message: "Tranche IR introuvable" };
  return await prisma.taxBracket.update({ where: { id }, data: { isActive: false, effectiveTo: new Date() } });
};