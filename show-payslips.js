#!/usr/bin/env node

/**
 * Script pour afficher les bulletins de paie et leur état
 */

import { prisma } from "./prismaClient.js";

async function displayPayslips() {
  try {
    console.log("📋 BULLETINS DE PAIE - ÉTAT DU SYSTÈME\n");

    // Compter les bulletins par statut
    const payslips = await prisma.payslip.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true } },
        payrollPeriod: { select: { year: true, month: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Total bulletins: ${payslips.length}\n`);

    if (payslips.length === 0) {
      console.log("⚠️  Aucun bulletin trouvé en base de données\n");
      console.log("Étapes à suivre:");
      console.log("1️⃣  Créer une période de paie");
      console.log("2️⃣  Créer une exécution (payroll run)");
      console.log("3️⃣  Cliquer sur 'Calculer' pour générer les bulletins\n");
      return;
    }

    // Afficher les bulletins
    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log("│ Bulletins Créés                                         │");
    console.log("├─────────────────────────────────────────────────────────┤");

    for (const slip of payslips) {
      const emp = `${slip.employee?.firstName} ${slip.employee?.lastName}`;
      const period = `${slip.payrollPeriod?.month}/${slip.payrollPeriod?.year}`;
      const net = `${slip.netSalary?.toFixed(2) || "0"} MAD`;
      const brut = `${slip.grossSalary?.toFixed(2) || "0"} MAD`;

      console.log(`│ ${emp.padEnd(20)} ${period.padEnd(10)}              │`);
      console.log(`│   Brut: ${brut.padEnd(12)} Net: ${net.padEnd(15)} │`);
      console.log(`│   Statut: ${slip.status.padEnd(40)} │`);
      console.log("├─────────────────────────────────────────────────────────┤");
    }

    console.log("└─────────────────────────────────────────────────────────┘\n");

    // Vérifier si les taux sont chargés
    const rates = await prisma.statutoryRate.findMany({
      where: { isActive: true },
    });

    console.log("📊 Taux configurés:");
    console.log(`   ✅ ${rates.length} taux actifs\n`);

    // Vérifier si le barème IR existe
    const brackets = await prisma.taxBracket.findMany({
      where: { isActive: true },
    });

    console.log("💰 Barème IR:");
    console.log(`   ✅ ${brackets.length} tranches configurées\n`);

    // Vérifier la configuration payroll
    const config = await prisma.payrollConfig.findFirst();
    if (config) {
      console.log("⚙️  Configuration PayrollConfig:");
      console.log(`   ✅ CNSS: ${config.cnssEnabled ? "Activée" : "Désactivée"}`);
      console.log(`   ✅ AMO: ${config.amoEnabled ? "Activée" : "Désactivée"}`);
      console.log(`   ✅ CIMR: ${config.cimrEnabled ? "Activée" : "Désactivée"}`);
      console.log(`   ✅ IR: ${config.irEnabled ? "Activée" : "Désactivée"}\n`);
    }
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

displayPayslips();
