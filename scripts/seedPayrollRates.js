/**
 * Script de seed des taux légaux marocains (CNSS, AMO, barème IR)
 * Exécution : node scripts/seedPayrollRates.js
 * 
 * Insère les taux statutaires et le barème IR dans la base de données
 * pour permettre au moteur de paie de fonctionner.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NATIONAL_TODAY = new Date("2026-01-01");

const STATUTORY_RATES = [
  // ── CNSS Salarié ─────────────────────────────────────────────────────────
  {
    code: "CNSS_EMPLOYEE",
    label: "CNSS Part Salariale (4.48%)",
    rate: 0.0448,     // 4.48%
    ceilingAmount: 6000.00, // Plafond mensuel 6000 MAD
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── CNSS Employeur ───────────────────────────────────────────────────────
  {
    code: "CNSS_EMPLOYER",
    label: "CNSS Part Patronale (8.60%)",
    rate: 0.0860,     // 8.60%
    ceilingAmount: 6000.00, // Même plafond
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── AMO Salarié ──────────────────────────────────────────────────────────
  {
    code: "AMO_EMPLOYEE",
    label: "AMO Part Salariale (1.82%)",
    rate: 0.0182,     // 1.82% du brut total (sans plafond)
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── AMO Employeur ────────────────────────────────────────────────────────
  {
    code: "AMO_EMPLOYER",
    label: "AMO Part Patronale (1.47%)",
    rate: 0.0147,     // 1.47% du brut total (sans plafond)
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── CIMR Salarié (facultatif, si activé) ─────────────────────────────────
  {
    code: "CIMR_EMPLOYEE",
    label: "CIMR Part Salariale (3%)",
    rate: 0.03,       // 3% (variable selon contrat)
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: false,  // Optionnel
  },
  // ── CIMR Employeur ───────────────────────────────────────────────────────
  {
    code: "CIMR_EMPLOYER",
    label: "CIMR Part Patronale (3%)",
    rate: 0.03,
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: false,
  },
  // ── Taxe de Formation Professionnelle ────────────────────────────────────
  {
    code: "TRAINING_TAX",
    label: "Taxe de Formation Professionnelle (1.6%)",
    rate: 0.016,      // 1.6%
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── Allocations Familiales ───────────────────────────────────────────────
  {
    code: "FAMILY_ALLOWANCE",
    label: "Allocations Familiales (6.40%)",
    rate: 0.064,      // 6.40%
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── Prestations Sociales ─────────────────────────────────────────────────
  {
    code: "SOCIAL_BENEFITS",
    label: "Prestations Sociales (0.53%)",
    rate: 0.0053,     // 0.53%
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  // ── DAMANCOM (facultatif, si activé) ─────────────────────────────────────
  {
    code: "DAMANCOM",
    label: "DAMANCOM (0.37%)",
    rate: 0.0037,
    ceilingAmount: null,
    effectiveFrom: NATIONAL_TODAY,
    isActive: false,  // Optionnel
  },
];

/**
 * Barème IR marocain 2026 (tranches annuelles)
 * Source : Code Général des Impôts
 * 
 * Calcul : (Revenu annuel imposable × Taux) - Somme à déduire
 * Puis on divise par 12 pour le mensuel (géré par le moteur)
 */
const TAX_BRACKETS = [
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 0,
    annualTo: 30000,
    rate: 0.00,       // 0%
    deductionAmount: 0,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 30001,
    annualTo: 50000,
    rate: 0.10,       // 10%
    deductionAmount: 3000,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 50001,
    annualTo: 60000,
    rate: 0.20,       // 20%
    deductionAmount: 8000,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 60001,
    annualTo: 80000,
    rate: 0.30,       // 30%
    deductionAmount: 14000,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 80001,
    annualTo: 180000,
    rate: 0.34,       // 34%
    deductionAmount: 17200,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
  {
    taxCode: "IR_SALAIRE",
    annualFrom: 180001,
    annualTo: null,    // Infini
    rate: 0.37,        // 37%
    deductionAmount: 22600,
    effectiveFrom: NATIONAL_TODAY,
    isActive: true,
  },
];

async function seed() {
  console.log("\n🚀 Seed des taux légaux marocains...\n");

  // ── 1. Statutory Rates ───────────────────────────────────────────────────
  console.log("📌 Taux statutaires (CNSS, AMO, etc.) :");
  let ratesCreated = 0;
  for (const rate of STATUTORY_RATES) {
    const existing = await prisma.statutoryRate.findFirst({
      where: {
        code: rate.code,
        effectiveFrom: rate.effectiveFrom,
        isActive: true,
      },
    });
    if (!existing) {
      await prisma.statutoryRate.create({ data: rate });
      console.log(`  ✅ ${rate.code} : ${rate.label} (${(rate.rate * 100).toFixed(2)}%)`);
      ratesCreated++;
    } else {
      console.log(`  ✓ ${rate.code} : déjà existant`);
    }
  }
  console.log(`  → ${ratesCreated} nouveau(x) taux créé(s)\n`);

  // ── 2. Tax Brackets (Barème IR) ──────────────────────────────────────────
  console.log("📌 Barème IR :");
  let bracketsCreated = 0;
  for (const bracket of TAX_BRACKETS) {
    const existing = await prisma.taxBracket.findFirst({
      where: {
        taxCode: bracket.taxCode,
        annualFrom: bracket.annualFrom,
        effectiveFrom: bracket.effectiveFrom,
        isActive: true,
      },
    });
    if (!existing) {
      await prisma.taxBracket.create({ data: bracket });
      const maxStr = bracket.annualTo !== null 
        ? `${bracket.annualTo.toLocaleString()} MAD` 
        : '∞';
      console.log(`  ✅ ${bracket.annualFrom.toLocaleString()} - ${maxStr} : ${(bracket.rate * 100).toFixed(0)}%`);
      bracketsCreated++;
    } else {
      console.log(`  ✓ Tranche ${bracket.annualFrom.toLocaleString()}-${bracket.annualTo?.toLocaleString() ?? '∞'} : déjà existante`);
    }
  }
  console.log(`  → ${bracketsCreated} nouvelle(s) tranche(s) créée(s)\n`);

  console.log("✅ Seed des taux légaux terminé avec succès !");
  console.log("📊 Le moteur de paie peut maintenant calculer correctement.\n");
}

seed()
  .catch((e) => {
    console.error("❌ Erreur:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());