/**
 * Script de test pour la génération de bulletins PDF
 * Usage: node test-payslip-pdf.js
 */

import { prisma } from "./prismaClient.js";
import { generatePayslipPdf, generatePayslipsBatch } from "./services/payslipPdfService.js";

async function testPayslipPdfGeneration() {
  try {
    console.log("🔍 Recherche d'un bulletin de paie...");
    
    // Trouver un bulletin existant
    const payslip = await prisma.payslip.findFirst({
      where: { status: "GENERATED" },
      include: {
        employee: true,
        payrollPeriod: true,
        company: true,
      },
    });

    if (!payslip) {
      console.log("⚠️  Aucun bulletin de paie trouvé. Veuillez d'abord:");
      console.log("   1. Créer une période de paie");
      console.log("   2. Calculer les salaires");
      return;
    }

    console.log(`✅ Bulletin trouvé: ${payslip.id}`);
    console.log(`   Employé: ${payslip.employee?.firstName} ${payslip.employee?.lastName}`);
    console.log(`   Salaire Brut: ${payslip.grossSalary} MAD`);
    console.log(`   Salaire Net: ${payslip.netSalary} MAD`);

    // Générer le PDF
    console.log("\n📄 Génération du PDF...");
    const result = await generatePayslipPdf(payslip.id);

    console.log("✅ PDF généré avec succès!");
    console.log(`   Nom du fichier: ${result.filename}`);
    console.log(`   Chemin: ${result.filepath}`);
    console.log(`   URL: ${result.relativePath}`);

    // Vérifier que le fichier existe
    const fs = await import("fs");
    if (fs.existsSync(result.filepath)) {
      const stats = fs.statSync(result.filepath);
      console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} KB`);
    }

  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Lancer le test
testPayslipPdfGeneration();
