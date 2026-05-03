import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Dossier de sortie PDF ────────────────────────────────────────────────────
const PDF_OUTPUT_DIR = path.join(__dirname, "../generated-pdfs");
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
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " MAD";
});

Handlebars.registerHelper("today", () =>
  new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
);

Handlebars.registerHelper("typeBadgeClass", (type) => {
  const map = {
    CDI: "badge-cdi",
    CDD: "badge-cdd",
    STAGE: "badge-stage",
    INTERIM: "badge-interim",
    FREELANCE: "badge-freelance",
  };
  return map[type] || "badge-default";
});

Handlebars.registerHelper("statusBadgeClass", (status) => {
  const map = {
    ACTIVE: "badge-active",
    DRAFT: "badge-draft",
    ENDED: "badge-ended",
    SUSPENDED: "badge-suspended",
    TERMINATED: "badge-terminated",
  };
  return map[status] || "badge-default";
});

Handlebars.registerHelper("typeLabel", (type) => {
  const map = {
    CDI: "CONTRAT À DURÉE INDÉTERMINÉE",
    CDD: "CONTRAT À DURÉE DÉTERMINÉE",
    STAGE: "CONVENTION DE STAGE",
    INTERIM: "CONTRAT DE MISSION INTÉRIMAIRE",
    FREELANCE: "CONTRAT DE PRESTATION DE SERVICE",
  };
  return map[type] || type;
});

Handlebars.registerHelper("isCDI", (type) => type === "CDI");
Handlebars.registerHelper("isCDD", (type) => type === "CDD");
Handlebars.registerHelper("isStage", (type) => type === "STAGE");
Handlebars.registerHelper("hasEndDate", (date) => !!date);

Handlebars.registerHelper("fullName", (firstName, lastName) => {
  return `${firstName || ""} ${lastName || ""}`.trim();
});

// ─── Chargement et compilation du template ───────────────────────────────────
const getTemplate = () => {
  const templatePath = path.join(__dirname, "../templates/contract.hbs");
  const source = fs.readFileSync(templatePath, "utf8");
  return Handlebars.compile(source);
};

// ─── Génération PDF ───────────────────────────────────────────────────────────
export const generateContractPdf = async (contractId) => {
  // 1. Charger le contrat avec toutes les relations
  const contract = await prisma.employeeContract.findUnique({
    where: { id: contractId },
    include: {
      employee: {
        include: {
          department: true,
          position: true,
          company: true,
        },
      },
    },
  });

  if (!contract) {
    throw { status: 404, message: "Contrat introuvable" };
  }

  const employee = contract.employee;
  const company = employee?.company;
  const department = employee?.department;
  const position = employee?.position;

  // 2. Préparer les données pour le template
  const data = {
    contract: {
      id: contract.id,
      type: contract.contractType,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      baseSalary: contract.baseSalary,
      hoursPerMonth: contract.hoursPerMonth || 191,
      workingDaysPerMonth: contract.workingDaysPerMonth || 26,
      transportAllowance: contract.transportAllowance,
      notes: contract.notes,
    },
    employee: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      cin: employee?.cin || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      employeeCode: employee?.employeeCode || "",
    },
    department: {
      name: department?.name || "—",
    },
    position: {
      title: position?.title || position?.name || employee?.position || "—",
    },
    company: {
      name: company?.name || "—",
      address: company?.address || "",
      city: company?.city || "Casablanca",
      phone: company?.phone || "",
      email: company?.email || "",
    },
  };

  // 3. Compiler le HTML
  const template = getTemplate();
  const html = template(data);

  // 4. Lancer Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const filename = `contrat-${contract.id}-${Date.now()}.pdf`;
  const filepath = path.join(PDF_OUTPUT_DIR, filename);

  await page.pdf({
    path: filepath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  return {
    filename,
    filepath,
    relativePath: `/contracts/pdf/${filename}`,
  };
};

// ─── Récupérer le chemin d'un PDF existant ────────────────────────────────────
export const getContractPdf = async (filename) => {
  // Sécuriser le nom de fichier (éviter path traversal)
  const safeName = path.basename(filename);
  const filepath = path.join(PDF_OUTPUT_DIR, safeName);

  if (!fs.existsSync(filepath)) {
    throw { status: 404, message: "Fichier PDF introuvable" };
  }

  return filepath;
};