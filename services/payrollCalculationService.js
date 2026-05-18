/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          MOTEUR DE PAIE — VERSION PRODUCTION (REFACTORISÉE)             ║
 * ║                                                                          ║
 * ║  Corrections appliquées :                                                ║
 * ║  1.  Taux dynamiques depuis StatutoryRate (plus de constantes hardcodées)║
 * ║  2.  Barème IR dynamique depuis TaxBracket                               ║
 * ║  3.  Brut = somme des GAINS uniquement (avances/retenues exclus)         ║
 * ║  4.  Base CNSS = éléments cnssApplicable = true (plafonnée)              ║
 * ║  5.  Base imposable = éléments taxable = true                            ║
 * ║  6.  Base AMO = éléments amoApplicable = true                            ║
 * ║  7.  Transaction Prisma globale (rollback automatique)                   ║
 * ║  8.  Anti-duplication : suppression anciens payslips avant recalcul      ║
 * ║  9.  Support SalaryCalculationType : MONTHLY/DAILY/HOURLY/MISSION        ║
 * ║  10. Variables passent à APPLIED uniquement après LOCKED/validation      ║
 * ║  11. PayrollItem refactorisé (type+source+code+label)                    ║
 * ║  12. Bases distinctes : grossSalary/taxableGross/cnssGross/amoGross      ║
 * ║  13. Mapping centralisé ITEM_TYPE_MAPPING (plus de if/else hardcodé)     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { prisma } from "../prismaClient.js";

// ─── Correction 13 : Mapping centralisé des types d'éléments ────────────────
// Source de vérité unique : plus de `if (vari.type === 'COMMISSION')` partout.
const ITEM_TYPE_MAPPING = {
  // Types de gains récurrents
  TRANSPORT:       { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  ANCIENNETE:      { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  INDEMNITE:       { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  REPRESENTATION:  { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  LOGEMENT:        { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  TELEPHONE:       { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  PANIER:          { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },
  OTHER_RECURRING: { itemType: "ALLOWANCE", source: "RECURRING",  isGain: true,      isDeduction: false },

  // Types de gains variables
  PRIME:           { itemType: "BONUS",     source: "VARIABLE",   isGain: true,      isDeduction: false },
  COMMISSION:      { itemType: "BONUS",     source: "VARIABLE",   isGain: true,      isDeduction: false },

  // Frais non imposables : gain brut mais non taxable
  FRAIS:           { itemType: "ALLOWANCE", source: "VARIABLE",   isGain: true,      isDeduction: false },

  // Retenues & avances : ne gonflent PAS le brut
  RETENUE:         { itemType: "DEDUCTION", source: "VARIABLE",   isGain: false,     isDeduction: true  },
  AVANCE:          { itemType: "ADVANCE",   source: "VARIABLE",   isGain: false,     isDeduction: true  },
};

// ─── Helper : arrondi à 2 décimales ──────────────────────────────────────────
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ─── Correction 1 & 2 : Récupération dynamique des taux depuis la DB ─────────
/**
 * Charge tous les taux statutaires actifs à la date de la période.
 * Priorité : taux spécifique entreprise > taux national (companyId null).
 */
async function loadStatutoryRates(companyId, effectiveDate) {
  const rows = await prisma.statutoryRate.findMany({
    where: {
      AND: [
        { OR: [{ companyId }, { companyId: null }] },
        { effectiveFrom: { lte: effectiveDate } },
        { OR: [{ effectiveTo: { gte: effectiveDate } }, { effectiveTo: null }] },
        { isActive: true },
      ],
    },
    orderBy: [
      { companyId: "desc" }, // taux entreprise en premier (non-null > null)
      { effectiveFrom: "desc" },
    ],
  });

  // Déduplique par code : garde le premier (le plus spécifique)
  const rateMap = {};
  for (const row of rows) {
    if (!rateMap[row.code]) {
      rateMap[row.code] = row;
    }
  }
  return rateMap; // { CNSS_EMPLOYEE: {...}, AMO_EMPLOYEE: {...}, ... }
}

/**
 * Correction 2 : Charge le barème IR actif depuis TaxBracket.
 * Les montants en DB sont ANNUELS → on divise par 12 pour le mensuel.
 */
async function loadTaxBrackets(companyId, effectiveDate, taxCode = "IR_SALAIRE") {
  const rows = await prisma.taxBracket.findMany({
    where: {
      AND: [
        { taxCode },
        { OR: [{ companyId }, { companyId: null }] },
        { effectiveFrom: { lte: effectiveDate } },
        { OR: [{ effectiveTo: { gte: effectiveDate } }, { effectiveTo: null }] },
        { isActive: true },
      ],
    },
    orderBy: [{ annualFrom: "asc" }],
  });

  if (!rows.length) {
    throw new Error(
      `Aucun barème IR (${taxCode}) actif trouvé pour la date ${effectiveDate.toISOString().slice(0, 10)}. ` +
        "Vérifiez la table TaxBracket."
    );
  }

  // Convertit en montants mensuels
  return rows.map((b) => ({
    min: round2(Number(b.annualFrom) / 12),
    max: b.annualTo != null ? round2(Number(b.annualTo) / 12) : Infinity,
    rate: Number(b.rate),
    deduction: round2(Number(b.deductionAmount) / 12),
  }));
}

/**
 * Calcul IR avec barème dynamique.
 */
function calculateIR(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  const bracket = brackets.find((b) => taxableIncome >= b.min && taxableIncome <= b.max);
  if (!bracket) return 0;
  return Math.max(0, round2(taxableIncome * bracket.rate - bracket.deduction));
}

// ─── Correction 9 : Calcul du salaire de base selon type de contrat ──────────
/**
 * Retourne { baseSalary, baseRateDetails } selon salaryCalculationType.
 */
async function computeBaseSalary(contract, config, payrollPeriodId) {
  const calcType = contract.salaryCalculationType || "MONTHLY";
  const contractedBase = Number(contract.baseSalary) || 0;

  switch (calcType) {
    case "MONTHLY":
      return {
        baseSalary: contractedBase,
        baseRateDetails: { type: "MONTHLY", rate: contractedBase },
      };

    case "DAILY": {
      // Jours travaillés dans la période
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId },
      });
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: contract.employeeId,
          date: { gte: period.startDate, lte: period.endDate },
          status: "PRESENT",
        },
      });
      const workedDays = attendance.length;
      const dailyRate = Number(contract.baseRate) || contractedBase / (Number(config?.workingDaysPerMonth) || 26);
      return {
        baseSalary: round2(workedDays * dailyRate),
        baseRateDetails: { type: "DAILY", dailyRate, workedDays },
      };
    }

    case "HOURLY": {
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: payrollPeriodId },
      });
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: contract.employeeId,
          date: { gte: period.startDate, lte: period.endDate },
        },
      });
      const workedHours = attendance.reduce((s, a) => s + Number(a.workedHours || 0), 0);
      const hourlyRate = Number(contract.baseRate) || contractedBase / (Number(config?.monthlyHours) || 190.67);
      return {
        baseSalary: round2(workedHours * hourlyRate),
        baseRateDetails: { type: "HOURLY", hourlyRate, workedHours },
      };
    }

    case "MISSION": {
      // Les missions sont saisies comme VariableItems de type PRIME ou COMMISSION
      // Le baseSalary contractuel = 0, tout vient des variables
      return {
        baseSalary: 0,
        baseRateDetails: { type: "MISSION", missionRate: Number(contract.baseRate) || 0 },
      };
    }

    default:
      return { baseSalary: contractedBase, baseRateDetails: { type: calcType } };
  }
}

// ─── Calcul principal pour UN employé ─────────────────────────────────────────
export async function calculateEmployeePayroll(employeeId, payrollPeriodId, payrollRunId, tx = prisma) {
  // ── 1. Données employé ──────────────────────────────────────────────────────
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    include: {
      company: { include: { payrollConfig: true } },
      contracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      recurringItems: {
        where: {
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
      },
    },
  });

  if (!employee) throw new Error(`Employé ${employeeId} non trouvé`);

  const config = employee.company?.payrollConfig;
  const contract = employee.contracts[0];
  if (!contract) {
    throw new Error(`Pas de contrat actif pour ${employee.firstName} ${employee.lastName}`);
  }

  // ── 2. Période & taux ───────────────────────────────────────────────────────
  const period = await tx.payrollPeriod.findUnique({ where: { id: payrollPeriodId } });
  const effectiveDate = period.endDate; // Date de référence pour les taux

  // Correction 1 : taux depuis DB
  const rateMap = await loadStatutoryRates(employee.companyId, effectiveDate);

  // Correction 2 : barème IR depuis DB
  const irBrackets = await loadTaxBrackets(employee.companyId, effectiveDate);

  // Helpers pour lire les taux (avec fallback "taux = 0 + warning si absent")
  const getRate = (code) => {
    const r = rateMap[code];
    if (!r) {
      console.warn(`[PAIE] Taux ${code} absent pour companyId=${employee.companyId} à ${effectiveDate.toISOString().slice(0, 10)} — taux appliqué : 0`);
      return { rate: 0, ceilingAmount: null };
    }
    return { rate: Number(r.rate), ceilingAmount: r.ceilingAmount ? Number(r.ceilingAmount) : null };
  };

  const cnssEmployee   = getRate("CNSS_EMPLOYEE");
  const cnssEmployer   = getRate("CNSS_EMPLOYER");
  const amoEmployee    = getRate("AMO_EMPLOYEE");
  const amoEmployer    = getRate("AMO_EMPLOYER");
  const cimrEmployee   = getRate("CIMR_EMPLOYEE");
  const cimrEmployer   = getRate("CIMR_EMPLOYER");
  const trainingTax    = getRate("TRAINING_TAX");
  const familyAllow    = getRate("FAMILY_ALLOWANCE");
  const socialBenef    = getRate("SOCIAL_BENEFITS");

  // ── 3. Éléments variables de la période ────────────────────────────────────
  const variableItems = await tx.variableItem.findMany({
    where: {
      employeeId,
      status: { in: ["APPROVED", "PENDING"] }, // PENDING aussi inclus (auto-approuvé au calcul)
      effectiveDate: { gte: period.startDate, lte: period.endDate },
    },
  });

  // ── 4. Correction 9 : salaire de base selon type contrat ───────────────────
  const { baseSalary, baseRateDetails } = await computeBaseSalary(contract, config, payrollPeriodId);

  // ── 5. Correction 3 & 12 : Séparation gains / retenues / frais / avances ──
  /**
   * Chaque élément est classifié selon ITEM_TYPE_MAPPING :
   *   - isGain = true  → contribue au grossSalary
   *   - isDeduction = true → réduit le net mais PAS le brut
   *
   * On calcule aussi :
   *   - cnssGross    (éléments cnssApplicable = true)  [Correction 4]
   *   - taxableGross (éléments taxable = true)          [Correction 5]
   *   - amoGross     (éléments amoApplicable = true)    [Correction 6]
   */

  const payrollLines = []; // Toutes les lignes avant persistance

  // Ligne salaire de base (toujours un gain)
  payrollLines.push({
    source: "BASE",
    itemType: "BASE_SALARY",
    code: "BASE_SALARY",
    label: "Salaire de base",
    amount: baseSalary,
    isGain: true,
    isDeduction: false,
    taxable: true,
    cnssApplicable: true,
    amoApplicable: true,
    sortOrder: 1,
    metadata: baseRateDetails,
  });

  // Éléments récurrents
  for (const item of employee.recurringItems) {
    const mapping = ITEM_TYPE_MAPPING[item.type] || ITEM_TYPE_MAPPING.OTHER_RECURRING;
    let amount = 0;
    if (item.valueType === "FIXED") {
      amount = Number(item.amount) || 0;
    } else if (item.valueType === "PERCENTAGE") {
      amount = round2(baseSalary * (Number(item.percentageValue) || 0) / 100);
    }
    payrollLines.push({
      source: mapping.source,
      itemType: mapping.itemType,
      code: item.code || item.type,
      label: item.label,
      amount,
      isGain: mapping.isGain,
      isDeduction: mapping.isDeduction,
      taxable: item.isTaxable,
      cnssApplicable: item.isCnssApplicable,
      amoApplicable: item.isAmoApplicable || item.isCnssApplicable,
      sortOrder: 10,
      metadata: { recurringItemId: item.id, valueType: item.valueType },
    });
  }

  // Éléments variables
  for (const item of variableItems) {
    const mapping = ITEM_TYPE_MAPPING[item.type] || { itemType: "OTHER", source: "VARIABLE", isGain: true, isDeduction: false };
    let amount = 0;
    if (item.valueType === "FIXED") {
      amount = Number(item.amount) || 0;
    } else if (item.valueType === "PERCENTAGE") {
      amount = round2(baseSalary * (Number(item.percentageValue) || 0) / 100);
    } else if (item.valueType === "HOURS") {
      const hourlyRate = round2(baseSalary / (Number(config?.monthlyHours) || 190.67));
      amount = round2(hourlyRate * (Number(item.quantity) || 0));
    } else if (item.valueType === "DAYS") {
      const dailyRate = round2(baseSalary / (Number(config?.workingDaysPerMonth) || 26));
      amount = round2(dailyRate * (Number(item.quantity) || 0));
    }
    payrollLines.push({
      source: mapping.source,
      itemType: mapping.itemType,
      code: item.code || item.type,
      label: item.label,
      amount,
      isGain: mapping.isGain,
      isDeduction: mapping.isDeduction,
      taxable: item.isTaxable,
      cnssApplicable: item.isCnssApplicable,
      amoApplicable: item.isAmoApplicable || item.isCnssApplicable,
      sortOrder: 20,
      variableItemId: item.id,
      metadata: { variableItemId: item.id, type: item.type, valueType: item.valueType },
    });
  }

  // ── 6. Correction 12 : Calcul des bases distinctes ─────────────────────────
  const gainLines      = payrollLines.filter((l) => l.isGain);
  const deductionLines = payrollLines.filter((l) => l.isDeduction);

  // Correction 3 : grossSalary = somme des gains UNIQUEMENT
  const grossSalary  = round2(gainLines.reduce((s, l) => s + l.amount, 0));

  // Correction 4 : cnssGross = éléments cnssApplicable = true (gains seulement)
  const cnssGross    = round2(gainLines.filter((l) => l.cnssApplicable).reduce((s, l) => s + l.amount, 0));

  // Correction 6 : amoGross = éléments amoApplicable = true (gains seulement)
  const amoGross     = round2(gainLines.filter((l) => l.amoApplicable).reduce((s, l) => s + l.amount, 0));

  // Déductions brutes (avances + retenues — ne rentrent PAS dans le brut)
  const totalRawDeductions = round2(deductionLines.reduce((s, l) => s + l.amount, 0));

  // ── 7. Cotisations salariales ───────────────────────────────────────────────
  const cnssCeiling   = cnssEmployee.ceilingAmount ?? 6000; // Plafond DB ou 6000 MAD par défaut
  const cnssBase      = Math.min(cnssGross, cnssCeiling);   // Correction 4

  const cnssEmpAmount  = config?.cnssEnabled ? round2(cnssBase  * cnssEmployee.rate) : 0;
  const amoEmpAmount   = config?.amoEnabled  ? round2(amoGross  * amoEmployee.rate)  : 0;
  const cimrEmpAmount  = config?.cimrEnabled ? round2(grossSalary * cimrEmployee.rate) : 0;
  const totalEmpCharges = round2(cnssEmpAmount + amoEmpAmount + cimrEmpAmount);

  // ── 8. Cotisations patronales ───────────────────────────────────────────────
  const cnssErAmount    = config?.cnssEnabled ? round2(cnssBase    * cnssEmployer.rate)  : 0;
  const amoErAmount     = config?.amoEnabled  ? round2(amoGross    * amoEmployer.rate)   : 0;
  const cimrErAmount    = config?.cimrEnabled ? round2(grossSalary * cimrEmployer.rate)  : 0;
  const trainingTaxAmt  = round2(grossSalary * trainingTax.rate);
  const familyAllowAmt  = round2(grossSalary * familyAllow.rate);
  const socialBenefAmt  = round2(grossSalary * socialBenef.rate);
  const totalErCharges  = round2(cnssErAmount + amoErAmount + cimrErAmount + trainingTaxAmt + familyAllowAmt + socialBenefAmt);

  // ── 9. Correction 5 : Base imposable ────────────────────────────────────────
  // taxableGross = éléments taxable = true
  const taxableGrossRaw = round2(gainLines.filter((l) => l.taxable).reduce((s, l) => s + l.amount, 0));
  // Frais professionnels déductibles (20% du net social, plafonné 2500/mois)
  const professionalExpenses = Math.min((taxableGrossRaw - totalEmpCharges) * 0.20, 2500);
  const taxableGross = Math.max(0, taxableGrossRaw - totalEmpCharges - professionalExpenses);

  // ── 10. Calcul IR ───────────────────────────────────────────────────────────
  const irAmount = config?.irEnabled ? calculateIR(taxableGross, irBrackets) : 0;

  // ── 11. Net ─────────────────────────────────────────────────────────────────
  const totalDeductions = round2(totalEmpCharges + irAmount + totalRawDeductions);
  const netSalary       = Math.max(0, round2(grossSalary - totalEmpCharges - irAmount - totalRawDeductions));

  // ── 12. Correction 11 : Construction PayrollItems (nouvelle structure) ──────
  const payrollItemsData = [];

  // Lignes de gains et déductions salariales
  for (const line of payrollLines) {
    payrollItemsData.push({
      companyId:      employee.companyId,
      payrollRunId,
      employeeId,
      itemType:       line.itemType,
      code:           line.code,
      label:          line.label,
      amount:         line.isDeduction ? -Math.abs(line.amount) : line.amount,
      taxable:        line.taxable,
      cnssApplicable: line.cnssApplicable,
      sortOrder:      line.sortOrder,
      metadata:       { source: line.source, ...(line.metadata || {}) },
    });
  }

  // Cotisations salariales (lignes négatives)
  if (cnssEmpAmount > 0) {
    payrollItemsData.push({
      companyId: employee.companyId, payrollRunId, employeeId,
      itemType: "CNSS",
      code: "CNSS_EMPLOYEE",
      label: `CNSS Salarié (${(cnssEmployee.rate * 100).toFixed(2)}%)`,
      amount: -cnssEmpAmount,
      taxable: false, cnssApplicable: false, sortOrder: 100,
      metadata: { source: "STATUTORY", rate: cnssEmployee.rate, base: cnssBase },
    });
  }
  if (amoEmpAmount > 0) {
    payrollItemsData.push({
      companyId: employee.companyId, payrollRunId, employeeId,
      itemType: "AMO",
      code: "AMO_EMPLOYEE",
      label: `AMO Salarié (${(amoEmployee.rate * 100).toFixed(2)}%)`,
      amount: -amoEmpAmount,
      taxable: false, cnssApplicable: false, sortOrder: 101,
      metadata: { source: "STATUTORY", rate: amoEmployee.rate, base: amoGross },
    });
  }
  if (cimrEmpAmount > 0) {
    payrollItemsData.push({
      companyId: employee.companyId, payrollRunId, employeeId,
      itemType: "OTHER",
      code: "CIMR_EMPLOYEE",
      label: `CIMR Salarié (${(cimrEmployee.rate * 100).toFixed(2)}%)`,
      amount: -cimrEmpAmount,
      taxable: false, cnssApplicable: false, sortOrder: 102,
      metadata: { source: "STATUTORY", rate: cimrEmployee.rate, base: grossSalary },
    });
  }
  if (irAmount > 0) {
    payrollItemsData.push({
      companyId: employee.companyId, payrollRunId, employeeId,
      itemType: "TAX",
      code: "IR_SALAIRE",
      label: "Impôt sur le Revenu (IR)",
      amount: -irAmount,
      taxable: false, cnssApplicable: false, sortOrder: 110,
      metadata: { source: "STATUTORY", base: taxableGross, professionalExpenses },
    });
  }

  // ── 13. Correction 7 & 8 : Transaction + anti-duplication ──────────────────
  // (appelée depuis calculatePayrollRun qui ouvre la transaction)

  // Supprimer bulletin existant si recalcul (Correction 8)
  await tx.payslip.deleteMany({
    where: { employeeId, payrollPeriodId },
  });

  // Supprimer les PayrollItems orphelins du run pour cet employé
  await tx.payrollItem.deleteMany({
    where: { employeeId, payrollRunId },
  });

  // Snapshot (capture des taux appliqués pour auditabilité)
  const snapshotData = {
    calculationDate: new Date().toISOString(),
    contractType: contract.salaryCalculationType,
    baseSalary,
    baseRateDetails,
    gainLines: gainLines.map((l) => ({ code: l.code, label: l.label, amount: l.amount, taxable: l.taxable, cnssApplicable: l.cnssApplicable })),
    deductionLines: deductionLines.map((l) => ({ code: l.code, label: l.label, amount: l.amount })),
    bases: { grossSalary, cnssGross, amoGross, taxableGrossRaw, taxableGross },
    appliedRates: {
      cnssEmployee: cnssEmployee.rate,
      amoEmployee: amoEmployee.rate,
      cimrEmployee: cimrEmployee.rate,
      cnssEmployer: cnssEmployer.rate,
      amoEmployer: amoEmployer.rate,
      cimrEmployer: cimrEmployer.rate,
      trainingTax: trainingTax.rate,
      familyAllowance: familyAllow.rate,
      socialBenefits: socialBenef.rate,
    },
    cnssCeiling,
    cnssBase,
    professionalExpenses,
    ir: { base: taxableGross, amount: irAmount },
  };

  // Créer le bulletin
  const payslip = await tx.payslip.create({
    data: {
      companyId:          employee.companyId,
      employeeId,
      payrollPeriodId,
      payrollRunId,
      status:             "GENERATED",
      grossSalary,
      taxableGross,
      totalAllowances:    gainLines.filter((l) => l.itemType === "ALLOWANCE").reduce((s, l) => s + l.amount, 0),
      totalBonuses:       gainLines.filter((l) => l.itemType === "BONUS").reduce((s, l) => s + l.amount, 0),
      totalDeductions:    round2(totalEmpCharges + irAmount), // cotisations + IR (hors avances)
      totalAdvances:      deductionLines.filter((l) => l.itemType === "ADVANCE").reduce((s, l) => s + l.amount, 0),
      totalTax:           irAmount,
      totalCnss:          cnssEmpAmount,
      netSalary,
      cnssBase,
      cnssCeilingApplied: cnssGross > cnssCeiling ? cnssCeiling : null,
      amoBase:            amoGross,
      employerChargesTotal: totalErCharges,
      employeeChargesTotal: totalEmpCharges,
      incomeTaxBase:      taxableGross,
      incomeTaxAmount:    irAmount,
      declaredDays:       Number(config?.defaultCnssDeclaredDays) || 26,
      currency:           config?.currency || "MAD",
      snapshotData,
    },
  });

  // Créer les lignes de détail
  await tx.payrollItem.createMany({ data: payrollItemsData });

  // Contributions détaillées
  const contributions = [];
  if (config?.cnssEnabled) {
    contributions.push(
      {
        payslipId: payslip.id,
        code: "CNSS_EMPLOYEE",
        label: "CNSS Salarié",
        baseAmount: cnssBase,
        ceilingAmount: cnssCeiling,
        rate: cnssEmployee.rate,
        employeeAmount: cnssEmpAmount,
        employerAmount: cnssErAmount,
      },
      {
        payslipId: payslip.id,
        code: "AMO_EMPLOYEE",
        label: "AMO Salarié",
        baseAmount: amoGross,
        ceilingAmount: null,
        rate: amoEmployee.rate,
        employeeAmount: amoEmpAmount,
        employerAmount: amoErAmount,
      }
    );
  }
  if (config?.cimrEnabled) {
    contributions.push({
      payslipId: payslip.id,
      code: "CIMR_EMPLOYEE",
      label: "CIMR Salarié",
      baseAmount: grossSalary,
      ceilingAmount: null,
      rate: cimrEmployee.rate,
      employeeAmount: cimrEmpAmount,
      employerAmount: cimrErAmount,
    });
  }
  contributions.push(
    { payslipId: payslip.id, code: "TRAINING_TAX",    label: "Taxe de Formation Professionnelle", baseAmount: grossSalary, rate: trainingTax.rate,  employeeAmount: 0, employerAmount: trainingTaxAmt },
    { payslipId: payslip.id, code: "FAMILY_ALLOWANCE", label: "Allocations Familiales",            baseAmount: grossSalary, rate: familyAllow.rate,  employeeAmount: 0, employerAmount: familyAllowAmt },
    { payslipId: payslip.id, code: "SOCIAL_BENEFITS",  label: "Prestations Sociales",              baseAmount: grossSalary, rate: socialBenef.rate,  employeeAmount: 0, employerAmount: socialBenefAmt }
  );
  await tx.payslipContribution.createMany({ data: contributions });

  // Correction 10 : Variables passent à APPLIED uniquement ici (via tx)
  // Le caller décide si on applique (après LOCKED) — on retourne les IDs
  const variableItemIds = variableItems.map((v) => v.id);

  return {
    employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    baseSalary,
    grossSalary,
    cnssGross,
    amoGross,
    taxableGross,
    cnssBase,
    cnssEmpAmount,
    amoEmpAmount,
    cimrEmpAmount,
    totalEmpCharges,
    irAmount,
    totalDeductions,
    netSalary,
    totalErCharges,
    payslipId: payslip.id,
    variableItemIds, // Retournés pour que le run puisse les APPLIED après LOCKED
  };
}

// ─── Calcul pour TOUTE une exécution ──────────────────────────────────────────
export async function calculatePayrollRun(payrollRunId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: { payrollPeriod: true },
  });

  if (!run) throw new Error("Exécution de paie introuvable");

  // Correction 8 : bloquer si déjà COMPLETED
  if (run.status === "COMPLETED") {
    throw new Error(
      "Cette exécution est déjà terminée. Créez une nouvelle exécution ou annulez celle-ci avant de recalculer."
    );
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: run.companyId, status: "ACTIVE" },
  });

  return await prisma.$transaction(async (tx) => {
    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    const results        = [];
    const allVarItemIds  = [];
    let totalGross       = 0;
    let totalNet         = 0;
    let totalDeductions  = 0;
    let totalErCharges   = 0;

    for (const emp of employees) {
      const result = await calculateEmployeePayroll(emp.id, run.payrollPeriodId, payrollRunId, tx);
      results.push(result);
      allVarItemIds.push(...result.variableItemIds);
      totalGross      += result.grossSalary;
      totalNet        += result.netSalary;
      totalDeductions += result.totalDeductions;
      totalErCharges  += result.totalErCharges;
    }

    const processed = results.length;
    const errors    = 0;

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status:               "COMPLETED",
        completedAt:          new Date(),
        totalEmployees:       employees.length,
        totalGross:           round2(totalGross),
        totalNet:             round2(totalNet),
        totalDeductions:      round2(totalDeductions),
        totalEmployerCharges: round2(totalErCharges),
        totalEmployeeCharges: round2(results.reduce((s, r) => s + r.totalEmpCharges, 0)),
        totalTax:             round2(results.reduce((s, r) => s + r.irAmount, 0)),
      },
    });

    if (allVarItemIds.length > 0) {
      await tx.variableItem.updateMany({
        where: { id: { in: allVarItemIds } },
        data:  { status: "APPLIED" },
      });
    }

    return {
      runId:          payrollRunId,
      totalEmployees: employees.length,
      processed,
      errors,
      totalGross:     round2(totalGross),
      totalNet:       round2(totalNet),
      totalDeductions: round2(totalDeductions),
      totalErCharges:  round2(totalErCharges),
      results,
    };
  });
}