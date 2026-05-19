/**
 * Service de génération de bulletin de paie (PDF)
 * Utilise Handlebars + Puppeteer pour générer des PDF professionnels
 */

import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Dossier de sortie PDF ────────────────────────────────────────────────────
const PDF_OUTPUT_DIR = path.join(__dirname, "../generated-pdfs/payslips");
if (!fs.existsSync(PDF_OUTPUT_DIR)) {
  fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
}

// ─── Helpers Handlebars ───────────────────────────────────────────────────────
Handlebars.registerHelper("formatDate", (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
});

Handlebars.registerHelper("formatMoney", (amount) => {
  if (amount == null) return "—";
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted}`;
});

Handlebars.registerHelper("today", () =>
  new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
);

Handlebars.registerHelper("multiply", (value, multiplier) => {
  if (!value || !multiplier) return "0";
  return (parseFloat(value) * parseFloat(multiplier)).toFixed(2);
});

Handlebars.registerHelper("ifEquals", function(a, b, options) {
  if (a === b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper("ifGreaterThan", function(value, threshold, options) {
  if (parseFloat(value) > parseFloat(threshold)) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// ─── Chargement et compilation du template ───────────────────────────────────
const getTemplate = () => {
  const templatePath = path.join(__dirname, "../templates/payslip.hbs");
  const source = fs.readFileSync(templatePath, "utf8");
  return Handlebars.compile(source);
};

// ─── Génération PDF ───────────────────────────────────────────────────────────
export const generatePayslipPdf = async (payslipId) => {
  // 1. Charger le bulletin avec toutes les relations
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          position: true,
          company: true,
        },
      },
      payrollRun: true,
      payrollPeriod: true,
      company: true,
      contributions: true,
    },
  });

  if (!payslip) {
    throw { status: 404, message: "Bulletin de paie introuvable" };
  }

  // Charger les PayrollItems séparément
  const payrollItems = payslip.payrollRunId
    ? await prisma.payrollItem.findMany({
        where: {
          payrollRunId: payslip.payrollRunId,
          employeeId: payslip.employeeId,
        },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  const employee = payslip.employee;
  const company = payslip.company;
  const period = payslip.payrollPeriod;

  // 2. Préparer les données pour le template
  
  // Grouper les items par catégorie
  const gainItems = [];
  const deductionItems = [];

  for (const item of payrollItems || []) {
    const lineItem = {
      code: item.code,
      label: item.label,
      amount: item.amount,
      rate: item.metadata?.rate || 0,
      quantity: item.metadata?.quantity || 1,
      category: item.amount >= 0 ? "GAINS" : "DEDUCTIONS",
    };

    if (item.amount >= 0 && item.itemType !== "TAX" && item.code !== "IR_SALAIRE") {
      gainItems.push(lineItem);
    } else if (item.amount < 0) {
      deductionItems.push(lineItem);
    }
  }

  // Récupérer la date du contrat de l'employé
  const contract = await prisma.employeeContract.findFirst({
    where: {
      employeeId: employee.id,
      status: "ACTIVE",
    },
    orderBy: { startDate: "desc" },
  });

  const data = {
    payslip: {
      id: payslip.id,
      payslipNumber: `${payslip.id.substring(0, 8)}`.toUpperCase(),
      status: payslip.status,
      createdAt: payslip.createdAt,
      grossSalary: payslip.grossSalary || 0,
      totalAllowances: payslip.totalAllowances || 0,
      totalBonuses: payslip.totalBonuses || 0,
      totalDeductions: payslip.totalDeductions || 0,
      totalAdvances: payslip.totalAdvances || 0,
      totalTax: payslip.totalTax || 0,
      totalCnss: payslip.totalCnss || 0,
      netSalary: payslip.netSalary || 0,
      cnssBase: payslip.cnssBase || 0,
      amoBase: payslip.amoBase || 0,
      incomeTaxBase: payslip.incomeTaxBase || 0,
      incomeTaxAmount: payslip.incomeTaxAmount || 0,
      employeeChargesTotal: payslip.employeeChargesTotal || 0,
      employerChargesTotal: payslip.employerChargesTotal || 0,
      currency: payslip.currency || "MAD",
      declaredDays: payslip.declaredDays || 26,
    },
    employee: {
      id: employee.id,
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      cin: employee.cin || "",
      email: employee.email || "",
      phone: employee.phone || "",
      employeeCode: employee.employeeCode || "",
      socialSecurityNumber: employee.socialSecurityNumber || "—",
      position: employee.position?.title || employee.position?.name || "—",
      familialStatus: employee.familialStatus || "—",
      numberChildren: employee.numberChildren || 0,
    },
    contract: {
      type: contract?.contractType || "—",
      startDate: contract?.startDate,
      status: contract?.status || "—",
    },
    company: {
      id: company?.id || "",
      name: company?.name || "—",
      address: company?.address || "",
      city: company?.city || "—",
      phone: company?.phone || "",
      email: company?.email || "",
    },
    payroll: {
      startDate: period?.startDate,
      endDate: period?.endDate,
      year: period?.year || new Date().getFullYear(),
      month: period?.month || new Date().getMonth() + 1,
    },
    items: gainItems,
    deductions: deductionItems.map((item) => ({
      ...item,
      amount: Math.abs(item.amount),
    })),
    contributions: (payslip.contributions || []).map((c) => ({
      code: c.code,
      label: c.label,
      baseAmount: c.baseAmount || 0,
      rate: c.rate || 0,
      employeeAmount: c.employeeAmount || 0,
      employerAmount: c.employerAmount || 0,
      ceilingAmount: c.ceilingAmount || null,
    })),
  };

  // 3. Compiler le HTML
  const template = getTemplate();
  const html = template(data);

  // 4. Lancer Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Réduire les délais d'attente
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    
    await page.setContent(html, { waitUntil: "networkidle0" });

    const filename = `bulletin-${employee.employeeCode}-${period?.year}-${String(period?.month).padStart(2, "0")}-${Date.now()}.pdf`;
    const filepath = path.join(PDF_OUTPUT_DIR, filename);

    await page.pdf({
      path: filepath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    return {
      filename,
      filepath,
      relativePath: `/payslips/pdf/${filename}`,
      payslipId,
      employeeCode: employee.employeeCode,
      period: `${period?.year}-${String(period?.month).padStart(2, "0")}`,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
};

// ─── Génération PDF en masse ──────────────────────────────────────────────────
export const generatePayslipsBatch = async (payslipIds) => {
  const results = [];
  const errors = [];

  for (const payslipId of payslipIds) {
    try {
      const result = await generatePayslipPdf(payslipId);
      results.push(result);
    } catch (error) {
      errors.push({
        payslipId,
        error: error.message || String(error),
      });
    }
  }

  return { results, errors };
};

// ─── Récupérer le chemin d'un PDF existant ────────────────────────────────────
export const getPayslipPdf = async (filename) => {
  // Sécuriser le nom de fichier (éviter path traversal)
  const safeName = path.basename(filename);
  const filepath = path.join(PDF_OUTPUT_DIR, safeName);

  if (!fs.existsSync(filepath)) {
    throw { status: 404, message: "Fichier PDF introuvable" };
  }

  return filepath;
};

// ─── Régénérer les PDFs d'une période complète ─────────────────────────────────
export const regeneratePayslipPdfsByPeriod = async (payrollPeriodId) => {
  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId },
    select: { id: true },
  });

  if (payslips.length === 0) {
    throw new Error("Aucun bulletin trouvé pour cette période");
  }

  const payslipIds = payslips.map((p) => p.id);
  return await generatePayslipsBatch(payslipIds);
};
