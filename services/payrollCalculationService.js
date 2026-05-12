import { prisma } from "../prismaClient.js";

// ─── Constantes de calcul (Maroc 2026) ────────────────────────────────────
const CNSS_EMPLOYEE_RATE = 0.0429;      // 4.29%
const CNSS_EMPLOYER_RATE = 0.0610;      // 6.10% (patronal)
const AMO_EMPLOYEE_RATE = 0.0200;       // 2.00%
const AMO_EMPLOYER_RATE = 0.0250;       // 2.50% (patronal)
const CIMR_EMPLOYEE_RATE = 0.0600;      // 6.00% (configurable)
const CIMR_EMPLOYER_RATE = 0.0600;      // 6.00% (patronal)
const TRAINING_TAX_RATE = 0.0160;       // 1.60% (taxe formation)
const FAMILY_ALLOWANCE_RATE = 0.0670;   // 6.70% (allocations familiales)
const SOCIAL_BENEFITS_RATE = 0.0087;    // 0.87% (prestations sociales)

const CNSS_CEILING = 6000;              // Plafond CNSS mensuel

// ─── Barème IR Maroc 2026 ─────────────────────────────────────────────────
const IR_BRACKETS = [
  { min: 0,      max: 2500,   rate: 0.00, deduction: 0 },
  { min: 2501,   max: 4166,   rate: 0.10, deduction: 250 },
  { min: 4167,   max: 5000,   rate: 0.20, deduction: 666.67 },
  { min: 5001,   max: 6666,   rate: 0.30, deduction: 1166.67 },
  { min: 6667,   max: 15000,  rate: 0.34, deduction: 1433.33 },
  { min: 15001,  max: Infinity, rate: 0.38, deduction: 2033.33 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateIR(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  const bracket = IR_BRACKETS.find(b => taxableIncome >= b.min && taxableIncome <= b.max);
  if (!bracket) return 0;
  return Math.max(0, round2((taxableIncome * bracket.rate) - bracket.deduction));
}

// ─── Calcul principal pour UN employé ─────────────────────────────────────
export async function calculateEmployeePayroll(employeeId, payrollPeriodId, payrollRunId) {
  
  // 1. Récupérer toutes les données nécessaires
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      company: { include: { payrollConfig: true } },
      contracts: { 
        where: { status: 'ACTIVE' }, 
        orderBy: { startDate: 'desc' },
        take: 1 
      },
      recurringItems: { 
        where: { 
          isActive: true,
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } }
          ]
        } 
      },
    }
  });

  if (!employee) throw new Error(`Employé ${employeeId} non trouvé`);
  
  const config = employee.company?.payrollConfig;
  const contract = employee.contracts[0];
  
  if (!contract) throw new Error(`Pas de contrat actif pour ${employee.firstName} ${employee.lastName}`);

  // 2. Récupérer les variables pour cette période
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollPeriodId } });
  const variableItems = await prisma.variableItem.findMany({
    where: {
      employeeId,
      status: { in: ['APPROVED', 'APPLIED'] },
      effectiveDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
  });

  // 3. Calcul des composantes du salaire
  const baseSalary = Number(contract.baseSalary) || 0;
  
  // Éléments récurrents
  let recurringTotal = 0;
  const recurringDetails = [];
  for (const item of employee.recurringItems) {
    let amount = 0;
    if (item.valueType === 'FIXED') {
      amount = Number(item.amount) || 0;
    } else if (item.valueType === 'PERCENTAGE') {
      amount = round2(baseSalary * (Number(item.percentageValue) || 0) / 100);
    }
    recurringTotal += amount;
    recurringDetails.push({
      type: item.type,
      label: item.label,
      amount,
      isTaxable: item.isTaxable,
      isCnssApplicable: item.isCnssApplicable,
    });
  }

  // Éléments variables
  let variableTotal = 0;
  const variableDetails = [];
  for (const item of variableItems) {
    let amount = 0;
    if (item.valueType === 'FIXED') {
      amount = Number(item.amount) || 0;
    } else if (item.valueType === 'PERCENTAGE') {
      amount = round2(baseSalary * (Number(item.percentageValue) || 0) / 100);
    } else if (item.valueType === 'HOURS') {
      const hourlyRate = round2(baseSalary / (Number(config?.monthlyHours) || 190.67));
      amount = round2(hourlyRate * (Number(item.quantity) || 0));
    } else if (item.valueType === 'DAYS') {
      const dailyRate = round2(baseSalary / (Number(config?.workingDaysPerMonth) || 26));
      amount = round2(dailyRate * (Number(item.quantity) || 0));
    }
    variableTotal += amount;
    variableDetails.push({
      type: item.type,
      label: item.label,
      amount,
      isTaxable: item.isTaxable,
      isCnssApplicable: item.isCnssApplicable,
    });
  }

  // 4. Salaire brut
  const grossSalary = round2(baseSalary + recurringTotal + variableTotal);

  // 5. Base CNSS (plafonnée)
  const cnssBase = Math.min(grossSalary, CNSS_CEILING);
  
  // 6. Cotisations employé
  const cnssEmployee = config?.cnssEnabled ? round2(cnssBase * CNSS_EMPLOYEE_RATE) : 0;
  const amoEmployee = config?.amoEnabled ? round2(grossSalary * AMO_EMPLOYEE_RATE) : 0;
  const cimrEmployee = config?.cimrEnabled ? round2(grossSalary * CIMR_EMPLOYEE_RATE) : 0;
  const totalEmployeeCharges = round2(cnssEmployee + amoEmployee + cimrEmployee);

  // 7. Cotisations employeur
  const cnssEmployer = config?.cnssEnabled ? round2(cnssBase * CNSS_EMPLOYER_RATE) : 0;
  const amoEmployer = config?.amoEnabled ? round2(grossSalary * AMO_EMPLOYER_RATE) : 0;
  const cimrEmployer = config?.cimrEnabled ? round2(grossSalary * CIMR_EMPLOYER_RATE) : 0;
  const trainingTax = round2(grossSalary * TRAINING_TAX_RATE);
  const familyAllowance = round2(grossSalary * FAMILY_ALLOWANCE_RATE);
  const socialBenefits = round2(grossSalary * SOCIAL_BENEFITS_RATE);
  const totalEmployerCharges = round2(cnssEmployer + amoEmployer + cimrEmployer + trainingTax + familyAllowance + socialBenefits);

  // 8. Calcul IR (Impôt sur le Revenu)
  // Revenu net imposable = Brut - Cotisations employé - Frais pro (20% plafonné à 2500)
  const professionalExpenses = Math.min((grossSalary - totalEmployeeCharges) * 0.20, 2500);
  const taxableIncome = Math.max(0, grossSalary - totalEmployeeCharges - professionalExpenses);
  const ir = config?.irEnabled ? calculateIR(taxableIncome) : 0;

  // 9. Salaire net
  const totalDeductions = round2(totalEmployeeCharges + ir);
  const netSalary = Math.max(0, round2(grossSalary - totalDeductions));

  // 10. Créer les PayrollItems (lignes détaillées)
  const payrollItems = [];
  
  // Ligne: Salaire de base
  payrollItems.push({
    companyId: employee.companyId,
    payrollRunId,
    employeeId,
    itemType: 'BASE_SALARY',
    label: 'Salaire de base',
    amount: baseSalary,
    taxable: true,
    cnssApplicable: true,
    sortOrder: 1,
  });

  // Lignes: Éléments récurrents
  for (const rec of recurringDetails) {
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType: 'ALLOWANCE',
      label: rec.label,
      amount: rec.amount,
      taxable: rec.isTaxable,
      cnssApplicable: rec.isCnssApplicable,
      sortOrder: 10,
    });
  }

  // Lignes: Éléments variables
  for (const vari of variableDetails) {
    let itemType = 'BONUS';
    if (vari.type === 'COMMISSION') itemType = 'BONUS';
    else if (vari.type === 'FRAIS') itemType = 'ALLOWANCE';
    else if (vari.type === 'AVANCE') itemType = 'ADVANCE';
    else if (vari.type === 'RETENUE') itemType = 'DEDUCTION';
    else if (vari.type === 'PRIME') itemType = 'BONUS';
    
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType,
      label: vari.label,
      amount: vari.amount,
      taxable: vari.isTaxable,
      cnssApplicable: vari.isCnssApplicable,
      sortOrder: 20,
    });
  }

  // Lignes: Cotisations (négatives)
  if (cnssEmployee > 0) {
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType: 'CNSS',
      label: 'CNSS Employé (4.29%)',
      amount: -cnssEmployee,
      taxable: false,
      cnssApplicable: false,
      sortOrder: 100,
    });
  }
  if (amoEmployee > 0) {
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType: 'AMO',
      label: 'AMO Employé (2%)',
      amount: -amoEmployee,
      taxable: false,
      cnssApplicable: false,
      sortOrder: 101,
    });
  }
  if (cimrEmployee > 0) {
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType: 'OTHER',
      label: 'CIMR Employé (6%)',
      amount: -cimrEmployee,
      taxable: false,
      cnssApplicable: false,
      sortOrder: 102,
    });
  }
  if (ir > 0) {
    payrollItems.push({
      companyId: employee.companyId,
      payrollRunId,
      employeeId,
      itemType: 'TAX',
      label: 'Impôt sur le Revenu (IR)',
      amount: -ir,
      taxable: false,
      cnssApplicable: false,
      sortOrder: 110,
    });
  }

  // 11. Créer le Payslip (bulletin de paie)
  const payslip = await prisma.payslip.create({
    data: {
      companyId: employee.companyId,
      employeeId,
      payrollPeriodId,
      payrollRunId,
      status: 'GENERATED',
      grossSalary,
      taxableGross: taxableIncome,
      totalAllowances: recurringDetails.filter(r => !r.isTaxable).reduce((s, r) => s + r.amount, 0),
      totalBonuses: variableDetails.filter(v => v.type === 'PRIME' || v.type === 'COMMISSION').reduce((s, v) => s + v.amount, 0),
      totalDeductions,
      totalAdvances: variableDetails.filter(v => v.type === 'AVANCE').reduce((s, v) => s + v.amount, 0),
      totalTax: ir,
      totalCnss: cnssEmployee,
      netSalary,
      cnssBase,
      cnssCeilingApplied: grossSalary > CNSS_CEILING ? CNSS_CEILING : null,
      amoBase: grossSalary,
      employerChargesTotal: totalEmployerCharges,
      employeeChargesTotal: totalEmployeeCharges,
      incomeTaxBase: taxableIncome,
      incomeTaxAmount: ir,
      declaredDays: Number(config?.defaultCnssDeclaredDays) || 26,
      currency: config?.currency || 'MAD',
      snapshotData: {
        baseSalary,
        recurringDetails,
        variableDetails,
        cotisations: {
          cnss: { employee: cnssEmployee, employer: cnssEmployer },
          amo: { employee: amoEmployee, employer: amoEmployer },
          cimr: { employee: cimrEmployee, employer: cimrEmployer },
          trainingTax,
          familyAllowance,
          socialBenefits,
        },
        ir: {
          taxableIncome,
          amount: ir,
          bracket: IR_BRACKETS.find(b => taxableIncome >= b.min && taxableIncome <= b.max),
        },
        professionalExpenses,
      },
    },
  });

  // 12. Créer les PayrollItems en base
  await prisma.payrollItem.createMany({
    data: payrollItems,
  });

  // 13. Créer les contributions détaillées
  const contributions = [];
  if (config?.cnssEnabled) {
    contributions.push(
      { payslipId: payslip.id, code: 'CNSS_EMPLOYEE', label: 'CNSS Employé', baseAmount: cnssBase, rate: CNSS_EMPLOYEE_RATE, employeeAmount: cnssEmployee, employerAmount: cnssEmployer },
      { payslipId: payslip.id, code: 'AMO_EMPLOYEE', label: 'AMO Employé', baseAmount: grossSalary, rate: AMO_EMPLOYEE_RATE, employeeAmount: amoEmployee, employerAmount: amoEmployer },
    );
  }
  if (config?.cimrEnabled) {
    contributions.push(
      { payslipId: payslip.id, code: 'CIMR_EMPLOYEE', label: 'CIMR Employé', baseAmount: grossSalary, rate: CIMR_EMPLOYEE_RATE, employeeAmount: cimrEmployee, employerAmount: cimrEmployer },
    );
  }
  contributions.push(
    { payslipId: payslip.id, code: 'TRAINING_TAX', label: 'Taxe Formation', baseAmount: grossSalary, rate: TRAINING_TAX_RATE, employeeAmount: 0, employerAmount: trainingTax },
    { payslipId: payslip.id, code: 'FAMILY_ALLOWANCE', label: 'Allocations Familiales', baseAmount: grossSalary, rate: FAMILY_ALLOWANCE_RATE, employeeAmount: 0, employerAmount: familyAllowance },
    { payslipId: payslip.id, code: 'SOCIAL_BENEFITS', label: 'Prestations Sociales', baseAmount: grossSalary, rate: SOCIAL_BENEFITS_RATE, employeeAmount: 0, employerAmount: socialBenefits },
  );

  await prisma.payslipContribution.createMany({ data: contributions });

  // 14. Marquer les variables comme APPLIED
  await prisma.variableItem.updateMany({
    where: { id: { in: variableItems.map(v => v.id) } },
    data: { status: 'APPLIED' },
  });

  return {
    employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    baseSalary,
    recurringTotal,
    variableTotal,
    grossSalary,
    cnssEmployee,
    amoEmployee,
    cimrEmployee,
    totalEmployeeCharges,
    ir,
    totalDeductions,
    netSalary,
    employerCharges: totalEmployerCharges,
    payslipId: payslip.id,
  };
}

// ─── Calcul pour TOUTE une exécution ──────────────────────────────────────
export async function calculatePayrollRun(payrollRunId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: { payrollPeriod: true },
  });

  if (!run) throw new Error('Exécution non trouvée');
  if (run.status === 'COMPLETED') throw new Error('Cette exécution est déjà terminée');

  // Passer en PROCESSING
  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    // Récupérer tous les employés actifs
    const employees = await prisma.employee.findMany({
      where: {
        companyId: run.companyId,
        status: 'ACTIVE',
      },
    });

    const results = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalEmployerCharges = 0;

    for (const emp of employees) {
      try {
        const result = await calculateEmployeePayroll(emp.id, run.payrollPeriodId, payrollRunId);
        results.push(result);
        totalGross += result.grossSalary;
        totalNet += result.netSalary;
        totalDeductions += result.totalDeductions;
        totalEmployerCharges += result.employerCharges;
      } catch (err) {
        results.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          error: err.message,
        });
      }
    }

    // Mettre à jour le Run avec les totaux
    await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalEmployees: employees.length,
        totalGross,
        totalNet,
        totalDeductions,
        totalEmployerCharges,
        totalEmployeeCharges: totalDeductions - results.filter(r => !r.error).reduce((s, r) => s + r.ir, 0),
        totalTax: results.filter(r => !r.error).reduce((s, r) => s + r.ir, 0),
      },
    });

    return {
      runId: payrollRunId,
      totalEmployees: employees.length,
      processed: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length,
      totalGross,
      totalNet,
      totalDeductions,
      totalEmployerCharges,
      results,
    };

  } catch (err) {
    // En cas d'erreur globale, remettre en DRAFT
    await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: 'DRAFT' },
    });
    throw err;
  }
}