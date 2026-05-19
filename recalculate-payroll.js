#!/usr/bin/env node

/**
 * Script pour recalculer les salaires après configuration des taux
 */

import { prisma } from "./prismaClient.js";
import { calculatePayrollRun } from "./services/payrollCalculationService.js";

async function recalculatePayroll() {
  try {
    console.log("🔄 RECALCUL DE LA PAIE AVEC LES NOUVEAUX TAUX\n");

    // Trouver le dernier run (complété)
    const latestRun = await prisma.payrollRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: { payrollPeriod: true },
    });

    if (!latestRun) {
      console.log("❌ Aucune exécution trouvée\n");
      return;
    }

    console.log(`📊 Run précédent trouvé: ${latestRun.id}`);
    console.log(`   Période: ${latestRun.payrollPeriod?.month}/${latestRun.payrollPeriod?.year}`);
    console.log(`   Statut: ${latestRun.status}\n`);

    // Créer une nouvelle exécution pour la même période
    console.log("➕ Création d'une nouvelle exécution...\n");
    const newRun = await prisma.payrollRun.create({
      data: {
        companyId: latestRun.companyId,
        payrollPeriodId: latestRun.payrollPeriodId,
        runNumber: (latestRun.runNumber || 0) + 1,
        status: "DRAFT",
      },
      include: { payrollPeriod: true },
    });

    console.log(`✅ Nouvelle exécution créée: ${newRun.id}`);
    console.log(`   Numéro: Run #${newRun.runNumber}\n`);

    // Recalculer
    console.log("⏳ Recalcul en cours...\n");
    const result = await calculatePayrollRun(newRun.id);

    console.log("✅ Recalcul terminé!\n");
    console.log("📈 Résultats:");
    console.log(`   Employés traités: ${result.processed}`);
    console.log(`   Total Brut: ${result.totalGross} MAD`);
    console.log(`   Total Net: ${result.totalNet} MAD`);
    console.log(`   Total Déductions: ${result.totalDeductions} MAD`);
    console.log(`   Total Charges Patronales: ${result.totalErCharges} MAD\n`);

    // Afficher détail
    if (result.results && result.results.length > 0) {
      console.log("👥 Détail par employé:\n");
      for (const emp of result.results) {
        console.log(`   ${emp.employeeName}`);
        console.log(`     Brut:       ${emp.grossSalary} MAD`);
        console.log(`     CNSS:      -${emp.cnssEmpAmount} MAD`);
        console.log(`     AMO:       -${emp.amoEmpAmount} MAD`);
        console.log(`     CIMR:      -${emp.cimrEmpAmount} MAD`);
        console.log(`     IR:        -${emp.irAmount} MAD`);
        console.log(`     ─────────────────────`);
        console.log(`     Net:        ${emp.netSalary} MAD\n`);
      }
    }

    console.log("✨ Les bulletins sont maintenant à jour avec les cotisations!\n");
    console.log("Prochaines étapes:");
    console.log("1️⃣  Vérifier dans l'interface: Paie → Bulletins");
    console.log("2️⃣  Générer les PDFs: POST /api/payslips/generate-pdfs");
    console.log("3️⃣  Télécharger les bulletins\n");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

recalculatePayroll();
