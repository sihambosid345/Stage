#!/usr/bin/env node

/**
 * Script pour générer les PDFs des bulletins
 */

import { prisma } from "./prismaClient.js";
import { generatePayslipPdf, generatePayslipsBatch } from "./services/payslipPdfService.js";

async function generateBulletinsPdf() {
  try {
    console.log("📄 GÉNÉRATION DES BULLETINS PDF\n");

    // Trouver tous les bulletins
    const payslips = await prisma.payslip.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        payrollPeriod: true,
      },
    });

    if (payslips.length === 0) {
      console.log("❌ Aucun bulletin trouvé\n");
      return;
    }

    console.log(`📋 ${payslips.length} bulletin(s) trouvé(s)\n`);

    const payslipIds = payslips.map((p) => p.id);

    console.log("⏳ Génération des PDFs...\n");
    const result = await generatePayslipsBatch(payslipIds);

    console.log(`✅ Génération terminée!\n`);
    console.log(`📊 Résultats:`);
    console.log(`   PDFs générés: ${result.results.length}`);
    console.log(`   Erreurs: ${result.errors.length}\n`);

    if (result.results.length > 0) {
      console.log("📄 PDFs créés:\n");
      for (const pdf of result.results) {
        console.log(`   ✅ ${pdf.filename}`);
        console.log(`      Employé: ${pdf.employeeCode}`);
        console.log(`      Période: ${pdf.period}\n`);
      }
    }

    if (result.errors.length > 0) {
      console.log("❌ Erreurs:\n");
      for (const error of result.errors) {
        console.log(`   ${error.payslipId}: ${error.error}\n`);
      }
    }

    console.log("✨ Les PDFs sont prêts à télécharger!\n");
    console.log("Dossier de stockage: generated-pdfs/payslips/\n");
    console.log("Télécharger un PDF:");
    console.log("GET /api/payslips/pdf/download/{filename}\n");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

generateBulletinsPdf();
