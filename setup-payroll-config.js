#!/usr/bin/env node

/**
 * Script de configuration - Initialise les taux, barème et configuration paie
 * IMPORTANT: À lancer UNE FOIS avant le premier calcul
 */

import { prisma } from "./prismaClient.js";

async function setupPayrollConfiguration() {
  try {
    console.log("🔧 Configuration du système de paie...\n");

    // 1. Trouver l'entreprise
    console.log("📍 Recherche de l'entreprise...");
    const company = await prisma.company.findFirst({
      include: { payrollConfig: true },
    });

    if (!company) {
      console.error("❌ Aucune entreprise trouvée");
      return;
    }

    console.log(`✅ Entreprise trouvée: ${company.name}`);
    console.log(`   ID: ${company.id}\n`);

    // 2. Activer/Créer PayrollConfig
    console.log("⚙️  Configuration PayrollConfig...");
    let config = company.payrollConfig;

    if (!config) {
      config = await prisma.payrollConfig.create({
        data: {
          companyId: company.id,
          cnssEnabled: true,
          amoEnabled: true,
          cimrEnabled: true,
          irEnabled: true,
          workingDaysPerMonth: 26,
          monthlyHours: 190.67,
          currency: "MAD",
          declaredDays: 26,
        },
      });
      console.log("✅ PayrollConfig créée");
    } else {
      // Mettre à jour si déjà existe
      config = await prisma.payrollConfig.update({
        where: { id: config.id },
        data: {
          cnssEnabled: true,
          amoEnabled: true,
          cimrEnabled: true,
          irEnabled: true,
        },
      });
      console.log("✅ PayrollConfig mise à jour");
    }

    console.log(`   - CNSS: ${config.cnssEnabled ? "✅" : "❌"}`);
    console.log(`   - AMO: ${config.amoEnabled ? "✅" : "❌"}`);
    console.log(`   - CIMR: ${config.cimrEnabled ? "✅" : "❌"}`);
    console.log(`   - IR: ${config.irEnabled ? "✅" : "❌"}\n`);

    // 3. Créer/Vérifier les taux statutaires
    console.log("📊 Taux statutaires...");
    const now = new Date();

    const tauxData = [
      {
        code: "CNSS_EMPLOYEE",
        rate: 0.0429,
        ceilingAmount: 6000,
        label: "CNSS Salarié",
      },
      {
        code: "CNSS_EMPLOYER",
        rate: 0.0829,
        label: "CNSS Employeur",
      },
      { code: "AMO_EMPLOYEE", rate: 0.0226, label: "AMO Salarié" },
      { code: "AMO_EMPLOYER", rate: 0.0826, label: "AMO Employeur" },
      { code: "CIMR_EMPLOYEE", rate: 0.0019, label: "CIMR Salarié" },
      { code: "CIMR_EMPLOYER", rate: 0.0019, label: "CIMR Employeur" },
      {
        code: "TRAINING_TAX",
        rate: 0.001,
        label: "Taxe de formation professionnelle",
      },
      {
        code: "FAMILY_ALLOWANCE",
        rate: 0.061,
        label: "Allocations familiales",
      },
      {
        code: "SOCIAL_BENEFITS",
        rate: 0.005,
        label: "Prestations sociales",
      },
    ];

    for (const taux of tauxData) {
      const exists = await prisma.statutoryRate.findFirst({
        where: {
          code: taux.code,
          companyId: company.id,
          isActive: true,
        },
      });

      if (!exists) {
        await prisma.statutoryRate.create({
          data: {
            companyId: company.id,
            code: taux.code,
            rate: taux.rate,
            ceilingAmount: taux.ceilingAmount || null,
            label: taux.label,
            effectiveFrom: new Date("2024-01-01"),
            effectiveTo: null,
            isActive: true,
          },
        });
        console.log(`✅ ${taux.code} créé (${(taux.rate * 100).toFixed(2)}%)`);
      } else {
        console.log(`⏭️  ${taux.code} existe déjà`);
      }
    }

    console.log();

    // 4. Créer/Vérifier le barème IR
    console.log("💰 Barème IR (montants annuels)...");

    const baremesIR = [
      { annualFrom: 0, annualTo: 24000, rate: 0, deductionAmount: 0 },
      { annualFrom: 24001, annualTo: 60000, rate: 0.1, deductionAmount: 2400 },
      { annualFrom: 60001, annualTo: 120000, rate: 0.2, deductionAmount: 8400 },
      { annualFrom: 120001, annualTo: null, rate: 0.3, deductionAmount: 20400 },
    ];

    for (const bareme of baremesIR) {
      const exists = await prisma.taxBracket.findFirst({
        where: {
          taxCode: "IR_SALAIRE",
          annualFrom: bareme.annualFrom,
          companyId: company.id,
          isActive: true,
        },
      });

      if (!exists) {
        await prisma.taxBracket.create({
          data: {
            companyId: company.id,
            taxCode: "IR_SALAIRE",
            annualFrom: bareme.annualFrom,
            annualTo: bareme.annualTo,
            rate: bareme.rate,
            deductionAmount: bareme.deductionAmount,
            effectiveFrom: new Date("2024-01-01"),
            effectiveTo: null,
            isActive: true,
          },
        });
        const range =
          bareme.annualTo === null
            ? `> ${bareme.annualFrom}`
            : `${bareme.annualFrom} - ${bareme.annualTo}`;
        console.log(`✅ Tranche ${range} créée (${(bareme.rate * 100).toFixed(1)}%)`);
      } else {
        console.log(`⏭️  Tranche ${bareme.annualFrom} existe déjà`);
      }
    }

    console.log("\n✨ Configuration complète!\n");
    console.log("📝 Récapitulatif:");
    console.log(`   - Entreprise: ${company.name}`);
    console.log(`   - CNSS: 4.29% (salarié), 8.29% (employeur), plafond 6000 MAD`);
    console.log(`   - AMO: 2.26% (salarié), 8.26% (employeur)`);
    console.log(`   - CIMR: 0.19% (salarié), 0.19% (employeur)`);
    console.log(`   - IR: Barème progressif (0% → 30%)`);
    console.log(`   - Jours travail: 26 jours/mois`);
    console.log(`   - Heures travail: 190.67 heures/mois\n`);

    console.log("✅ Vous pouvez maintenant calculer les salaires!");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupPayrollConfiguration();
