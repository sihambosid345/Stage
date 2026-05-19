#!/usr/bin/env node

/**
 * Script de vérification de l'installation du système de bulletins PDF
 * Usage: node check-payslip-setup.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];

function checkFile(filePath, name) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  checks.push({
    name,
    status: exists ? "✅" : "❌",
    path: filePath,
  });
  return exists;
}

function checkDirectory(dirPath, name) {
  const fullPath = path.join(__dirname, dirPath);
  const exists = fs.existsSync(fullPath);
  checks.push({
    name,
    status: exists ? "✅" : "❌",
    path: dirPath,
  });
  return exists;
}

console.log("📋 VÉRIFICATION DE L'INSTALLATION DU SYSTÈME DE BULLETINS PDF\n");

// Vérifier les fichiers
console.log("📁 Fichiers générés:");
checkFile("templates/payslip.hbs", "Template Handlebars");
checkFile("services/payslipPdfService.js", "Service PDF");
checkFile("PAYSLIP_PDF_GUIDE.md", "Documentation API");
checkFile("CALCUL_SALAIRE_NET.md", "Guide de calcul");
checkFile("test-payslip-pdf.js", "Script de test");

// Vérifier les modifications
console.log("\n🔧 Fichiers modifiés:");
checkFile("controllers/payslipController.js", "Contrôleur (mis à jour)");
checkFile("routes/payslipRoutes.js", "Routes (mises à jour)");

// Vérifier les répertoires
console.log("\n📂 Répertoires:");
checkDirectory("templates", "Dossier templates");
checkDirectory("services", "Dossier services");
checkDirectory("controllers", "Dossier controllers");
checkDirectory("routes", "Dossier routes");

// Vérifier les dépendances dans package.json
console.log("\n📦 Dépendances:");
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
  
  const deps = packageJson.dependencies || {};
  const hasPuppeteer = !!deps.puppeteer;
  const hasHandlebars = !!deps.handlebars;
  
  checks.push({
    name: `Puppeteer (${deps.puppeteer || "manquant"})`,
    status: hasPuppeteer ? "✅" : "❌",
    path: "package.json",
  });
  
  checks.push({
    name: `Handlebars (${deps.handlebars || "manquant"})`,
    status: hasHandlebars ? "✅" : "❌",
    path: "package.json",
  });
} catch (error) {
  checks.push({
    name: "Lecture package.json",
    status: "❌",
    path: "package.json",
  });
}

// Afficher le résumé
console.log("\n" + "─".repeat(50));
console.log("📊 RÉSUMÉ DES VÉRIFICATIONS:\n");
checks.forEach((check) => {
  const statusIcon = check.status;
  const name = check.name.padEnd(40);
  console.log(`${statusIcon}  ${name} (${check.path})`);
});

const successful = checks.filter((c) => c.status === "✅").length;
const total = checks.length;

console.log("\n" + "─".repeat(50));
console.log(`✅ ${successful}/${total} vérifications réussies\n`);

if (successful === total) {
  console.log("🎉 Système de bulletins PDF correctement installé!\n");
  console.log("Prochaines étapes:");
  console.log("1. Vérifier que Puppeteer est bien installé:");
  console.log("   npm list puppeteer handlebars\n");
  console.log("2. Tester la génération:");
  console.log("   node test-payslip-pdf.js\n");
  console.log("3. Consulter la documentation:");
  console.log("   - PAYSLIP_PDF_GUIDE.md (API)\n");
  console.log("   - CALCUL_SALAIRE_NET.md (Calculs)\n");
} else {
  console.log("❌ Certains fichiers sont manquants!\n");
  console.log("Vérifiez que tous les fichiers ont été créés.");
}
