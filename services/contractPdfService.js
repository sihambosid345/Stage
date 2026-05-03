import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Dossier de sortie PDF - CORRIGÉ ────────────────────────────────────────────
// Utiliser process.cwd() pour obtenir la racine du projet (stage2)
const PROJECT_ROOT = process.cwd(); // C:\Users\fujtsu\Desktop\stage2
const PDF_OUTPUT_DIR = path.join(PROJECT_ROOT, "contract-generator", "generated-pdfs");

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(PDF_OUTPUT_DIR)) {
  fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
  console.log(`✅ Dossier PDF créé: ${PDF_OUTPUT_DIR}`);
}

console.log(`📁 Dossier PDF configuré: ${PDF_OUTPUT_DIR}`);

// ─── Helpers Handlebars ───────────────────────────────────────────────────────
const registerHelpers = () => {
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

  Handlebars.registerHelper("fullName", (firstName, lastName) => {
    return `${firstName || ""} ${lastName || ""}`.trim();
  });

  Handlebars.registerHelper("dateDiff", (startDate, endDate) => {
    if (!startDate || !endDate) return "—";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} jours`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return days > 0 ? `${months} mois et ${days} jours` : `${months} mois`;
    } else {
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      let result = `${years} an${years > 1 ? 's' : ''}`;
      if (months > 0) result += ` et ${months} mois`;
      return result;
    }
  });

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
      CDI: "Contrat à Durée Indéterminée",
      CDD: "Contrat à Durée Déterminée",
      STAGE: "Convention de Stage",
      INTERIM: "Contrat de Mission Intérimaire",
      FREELANCE: "Contrat de Prestation de Service",
    };
    return map[type] || type;
  });

  Handlebars.registerHelper("isCDI", function(type, options) {
    return type === "CDI" ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper("isCDD", function(type, options) {
    return type === "CDD" ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper("isStage", function(type, options) {
    return type === "STAGE" ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper("isInterim", function(type, options) {
    return type === "INTERIM" ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper("isFreelance", function(type, options) {
    return type === "FREELANCE" ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper("hasEndDate", function(date, options) {
    return date ? options.fn(this) : options.inverse(this);
  });
};

// ─── Obtenir le chemin du template selon le type - CORRIGÉ ──────────────────────
const getTemplatePath = (contractType) => {
  const templatesDir = path.join(PROJECT_ROOT, "contract-generator", "templates");
  
  const templates = {
    CDI: path.join(templatesDir, "contrat-cdi.hbs"),
    CDD: path.join(templatesDir, "contrat-cdd.hbs"),
    STAGE: path.join(templatesDir, "contrat-stage.hbs"),
    INTERIM: path.join(templatesDir, "contrat-interim.hbs"),
    FREELANCE: path.join(templatesDir, "contrat-freelance.hbs"),
  };
  
  const templatePath = templates[contractType] || path.join(templatesDir, "contrat-other.hbs");
  
  console.log(`📄 Template path pour ${contractType}: ${templatePath}`);
  
  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️ Template ${contractType} non trouvé à: ${templatePath}`);
    // Fallback sur le template CDI
    const fallbackPath = path.join(templatesDir, "contrat-cdi.hbs");
    if (fs.existsSync(fallbackPath)) {
      console.warn(`⚠️ Utilisation du template CDI par défaut`);
      return fallbackPath;
    }
    throw new Error(`Template introuvable pour le type ${contractType}: ${templatePath}`);
  }
  
  return templatePath;
};

// ─── Préparer les données pour le template ────────────────────────────────────
const prepareData = async (contractId) => {
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

  return {
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
};

// ─── Compiler le template ─────────────────────────────────────────────────────
const compileTemplate = (contractType, data) => {
  const templatePath = getTemplatePath(contractType);
  const source = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(source);
  return template(data);
};

// ─── Génération PDF à partir d'un ID contrat ───────────────────────────────────
export const generateContractPdf = async (contractId) => {
  try {
    // Enregistrer les helpers
    registerHelpers();
    
    // Préparer les données
    const data = await prepareData(contractId);
    const contractType = data.contract.type;
    
    console.log(`📄 Génération PDF pour contrat ${contractId} (Type: ${contractType})`);
    console.log(`📁 Dossier de sortie: ${PDF_OUTPUT_DIR}`);
    
    // Compiler le HTML selon le type
    const html = compileTemplate(contractType, data);
    
    // Générer le PDF avec Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const filename = `contrat-${contractType}-${contractId}-${Date.now()}.pdf`;
    const filepath = path.join(PDF_OUTPUT_DIR, filename);
    
    console.log(`📝 Sauvegarde du PDF: ${filepath}`);
    
    await page.pdf({
      path: filepath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    
    await browser.close();
    
    console.log(`✅ PDF généré avec succès: ${filename}`);
    
    return {
      filename,
      filepath,
      relativePath: `/contracts/pdf/${filename}`,
    };
  } catch (error) {
    console.error('❌ Erreur generateContractPdf:', error);
    throw error;
  }
};

// ─── Récupérer un PDF existant ─────────────────────────────────────────────────
export const getContractPdf = async (filename) => {
  const safeName = path.basename(filename);
  const filepath = path.join(PDF_OUTPUT_DIR, safeName);
  
  console.log(`🔍 Recherche du PDF: ${filepath}`);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ PDF non trouvé: ${filepath}`);
    throw { status: 404, message: "Fichier PDF introuvable" };
  }
  
  console.log(`✅ PDF trouvé: ${filepath}`);
  return filepath;
};

// ─── Génération PDF à partir de données directes (optionnel) ───────────────────
export const generateContractPdfFromData = async (data) => {
  try {
    registerHelpers();
    
    const contractType = data.contract?.type || "CDI";
    
    console.log(`📄 Génération PDF manuelle (Type: ${contractType})`);
    
    const html = compileTemplate(contractType, data);
    
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const filename = `contrat-${contractType}-manual-${Date.now()}.pdf`;
    const filepath = path.join(PDF_OUTPUT_DIR, filename);
    
    await page.pdf({
      path: filepath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    
    await browser.close();
    
    console.log(`✅ PDF manuel généré: ${filename}`);
    return { filename, filepath };
  } catch (error) {
    console.error('❌ Erreur generateContractPdfFromData:', error);
    throw error;
  }
};