#!/usr/bin/env node

/**
 * Script de validation finale - Vérifie que tout fonctionne
 */

import { prisma } from "./prismaClient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateSystem() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        VALIDATION FINALE - SYSTÈME DE PAIE                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  let isValid = true;

  // 1. Vérifier les taux
  console.log("📊 Vérification des taux...\n");
  const rates = await prisma.statutoryRate.findMany({
    where: { isActive: true },
  });

  const requiredRates = [
    "CNSS_EMPLOYEE",
    "AMO_EMPLOYEE",
    "CIMR_EMPLOYEE",
    "TRAINING_TAX",
  ];
  const foundRates = rates.map((r) => r.code);

  for (const rate of requiredRates) {
    const found = foundRates.includes(rate);
    console.log(`${found ? "✅" : "❌"} ${rate}`);
    if (!found) isValid = false;
  }

  // 2. Vérifier le barème IR
  console.log("\n💰 Vérification du barème IR...\n");
  const brackets = await prisma.taxBracket.findMany({
    where: { isActive: true },
  });

  if (brackets.length >= 4) {
    console.log(`✅ Barème IR: ${brackets.length} tranches`);
  } else {
    console.log(`❌ Barème IR: manquant ou incomplet (${brackets.length}/4)`);
    isValid = false;
  }

  // 3. Vérifier les bulletins
  console.log("\n📋 Vérification des bulletins...\n");
  const payslips = await prisma.payslip.findMany();

  if (payslips.length > 0) {
    console.log(`✅ ${payslips.length} bulletin(s) trouvé(s)`);

    const withDeductions = payslips.filter((p) =>
      (p.totalDeductions || 0) > 0
    ).length;

    if (withDeductions > 0) {
      console.log(`✅ ${withDeductions} bulletin(s) avec déductions appliquées`);
    } else {
      console.log(`❌ Aucun bulletin avec déductions`);
      isValid = false;
    }
  } else {
    console.log(`⚠️  Aucun bulletin trouvé (normal si première utilisation)`);
  }

  // 4. Vérifier les PDFs
  console.log("\n📄 Vérification des PDFs...\n");
  const pdfDir = path.join(__dirname, "generated-pdfs/payslips");

  if (fs.existsSync(pdfDir)) {
    const files = fs.readdirSync(pdfDir);
    console.log(`✅ Dossier PDFs existe: ${files.length} fichier(s)`);
  } else {
    console.log(`⚠️  Dossier PDFs n'existe pas encore (créé à la première génération)`);
  }

  // 5. Vérifier la configuration
  console.log("\n⚙️  Vérification de la configuration...\n");
  const config = await prisma.payrollConfig.findFirst();

  if (config) {
    console.log(`✅ Configuration trouvée:`);
    console.log(`   - CNSS: ${config.cnssEnabled ? "✅" : "❌"}`);
    console.log(`   - AMO: ${config.amoEnabled ? "✅" : "❌"}`);
    console.log(`   - CIMR: ${config.cimrEnabled ? "✅" : "❌"}`);
    console.log(`   - IR: ${config.irEnabled ? "✅" : "❌"}`);

    if (!config.cnssEnabled || !config.amoEnabled) {
      isValid = false;
    }
  } else {
    console.log(`❌ Pas de configuration PayrollConfig`);
    isValid = false;
  }

  // 6. Vérifier les fichiers
  console.log("\n📁 Vérification des fichiers...\n");

  const requiredFiles = [
    "templates/payslip.hbs",
    "services/payslipPdfService.js",
    "controllers/payslipController.js",
    "routes/payslipRoutes.js",
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? "✅" : "❌"} ${file}`);
    if (!exists) isValid = false;
  }

  // 7. Résumé
  console.log("\n" + "═".repeat(60));
  if (isValid) {
    console.log("✅ VALIDATION RÉUSSIE - SYSTÈME OPÉRATIONNEL\n");
    console.log("Prochaines étapes:");
    console.log("1. Créer une période de paie");
    console.log("2. Créer une exécution et calculer les salaires");
    console.log("3. Générer les PDFs");
    console.log("4. Télécharger les bulletins\n");
  } else {
    console.log("❌ VALIDATION ÉCHOUÉE - PROBLÈMES DÉTECTÉS\n");
    console.log("Résolution:");
    console.log("1. Lancer: node setup-payroll-config.js");
    console.log("2. Lancer: node recalculate-payroll.js");
    console.log("3. Lancer: node generate-payslips-pdf.js\n");
  }

  console.log("═".repeat(60) + "\n");

  // Afficher un exemple
  if (payslips.length > 0 && payslips[0].totalDeductions > 0) {
    console.log("📊 EXEMPLE DE BULLETIN:\n");
    const sample = payslips[0];
    console.log(`Employé: ${sample.employeeId}`);
    console.log(`Brut:           ${sample.grossSalary} MAD`);
    console.log(`Déductions:    -${sample.totalDeductions} MAD`);
    console.log(`Net:            ${sample.netSalary} MAD`);
    console.log("\n");
  }

  await prisma.$disconnect();
}

validateSystem();
