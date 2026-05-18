/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        GÉNÉRATEUR BULLETIN DE PAIE — MODÈLE MAROCAIN (A4)               ║
 * ║  Conforme au Code du Travail marocain et aux pratiques RH locales        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import puppeteer from "puppeteer";
import { prisma } from "../prismaClient.js";

// ─── Formatage ────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  if (n == null || isNaN(n)) return "0,00";
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

function fmtRate(r) {
  if (r == null) return "—";
  return (Number(r) * 100).toFixed(2) + " %";
}

const MONTHS_FR = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function fmtPeriod(year, month) {
  return `${MONTHS_FR[month] ?? month} ${year}`;
}

// ─── Génération HTML bulletin ─────────────────────────────────────────────────
function buildHtml(data) {
  const {
    employee, company, period,
    baseSalary, grossSalary, netSalary,
    cnssBase, amoGross, taxableGross,
    cnssEmpAmount, amoEmpAmount, cimrEmpAmount,
    totalEmpCharges, incomeTaxBase, incomeTaxAmount,
    totalDeductions, employerChargesTotal,
    gainItems, deductionItems, contributions,
    snapshotData, declaredDays,
  } = data;

  const rates = snapshotData?.appliedRates || {};
  const cnssCeiling = snapshotData?.cnssCeiling ?? 6000;
  const profExpenses = snapshotData?.professionalExpenses ?? 0;

  // Construire les lignes de gains
  const gainRows = gainItems.map(item => `
    <tr>
      <td class="item-label">${item.label}</td>
      <td class="item-base">${item.cnssApplicable ? fmtMoney(item.amount) : "—"}</td>
      <td class="item-rate">${item.amount !== baseSalary ? (item.metadata?.valueType === "PERCENTAGE" ? fmtRate(item.metadata?.percentageValue / 100) : "—") : "—"}</td>
      <td class="item-amount gain">${fmtMoney(Math.abs(item.amount))}</td>
      <td class="item-amount empty"></td>
    </tr>
  `).join("");

  // Lignes de retenues (CNSS, AMO, CIMR, IR)
  const deductionRows = [];

  if (cnssEmpAmount > 0) {
    deductionRows.push(`
      <tr>
        <td class="item-label">CNSS — Part salariale</td>
        <td class="item-base">${fmtMoney(cnssBase)}</td>
        <td class="item-rate">${fmtRate(rates.cnssEmployee ?? 0.0448)}</td>
        <td class="item-amount empty"></td>
        <td class="item-amount deduct">${fmtMoney(cnssEmpAmount)}</td>
      </tr>
    `);
  }

  if (amoEmpAmount > 0) {
    deductionRows.push(`
      <tr>
        <td class="item-label">AMO — Part salariale</td>
        <td class="item-base">${fmtMoney(amoGross)}</td>
        <td class="item-rate">${fmtRate(rates.amoEmployee ?? 0.0182)}</td>
        <td class="item-amount empty"></td>
        <td class="item-amount deduct">${fmtMoney(amoEmpAmount)}</td>
      </tr>
    `);
  }

  if (cimrEmpAmount > 0) {
    deductionRows.push(`
      <tr>
        <td class="item-label">CIMR — Part salariale</td>
        <td class="item-base">${fmtMoney(grossSalary)}</td>
        <td class="item-rate">${fmtRate(rates.cimrEmployee ?? 0.03)}</td>
        <td class="item-amount empty"></td>
        <td class="item-amount deduct">${fmtMoney(cimrEmpAmount)}</td>
      </tr>
    `);
  }

  if (incomeTaxAmount > 0) {
    deductionRows.push(`
      <tr>
        <td class="item-label">Impôt sur le Revenu (IR)</td>
        <td class="item-base">${fmtMoney(incomeTaxBase)}</td>
        <td class="item-rate">Barème</td>
        <td class="item-amount empty"></td>
        <td class="item-amount deduct">${fmtMoney(incomeTaxAmount)}</td>
      </tr>
    `);
  }

  // Autres retenues (avances, retenues variables)
  const otherDeductRows = deductionItems.map(item => `
    <tr>
      <td class="item-label">${item.label}</td>
      <td class="item-base">—</td>
      <td class="item-rate">—</td>
      <td class="item-amount empty"></td>
      <td class="item-amount deduct">${fmtMoney(Math.abs(item.amount))}</td>
    </tr>
  `).join("");

  // Cotisations patronales
  const erRows = contributions
    .filter(c => c.employerAmount > 0)
    .map(c => `
      <tr>
        <td>${c.label}</td>
        <td class="right">${fmtMoney(c.baseAmount)}</td>
        <td class="right">${fmtRate(c.rate)}</td>
        <td class="right">${fmtMoney(c.employerAmount)}</td>
      </tr>
    `).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial', sans-serif;
    font-size: 9.5pt;
    color: #1a1a1a;
    background: white;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 10mm 12mm;
  }

  /* ── En-tête ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6mm;
    border-bottom: 2.5px solid #1a3a5c;
    padding-bottom: 4mm;
  }
  .header-company { flex: 1; }
  .company-name {
    font-size: 14pt;
    font-weight: 700;
    color: #1a3a5c;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .company-info { font-size: 8.5pt; color: #555; margin-top: 2px; line-height: 1.5; }
  .header-title {
    text-align: right;
    flex: 0 0 auto;
  }
  .bulletin-title {
    font-size: 16pt;
    font-weight: 700;
    color: #1a3a5c;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .bulletin-period {
    font-size: 11pt;
    color: #c0392b;
    font-weight: 600;
    margin-top: 2px;
  }

  /* ── Bloc employé / entreprise ── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    margin-bottom: 5mm;
  }
  .info-box {
    border: 1px solid #d0d7de;
    border-radius: 3px;
    padding: 3mm 4mm;
    background: #f8fafc;
  }
  .info-box-title {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #1a3a5c;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 1.5mm;
    margin-bottom: 2mm;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5mm;
    font-size: 8.5pt;
    line-height: 1.4;
  }
  .info-row .lbl { color: #666; }
  .info-row .val { font-weight: 600; text-align: right; }

  /* ── Tableau principal ── */
  .main-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4mm;
    font-size: 8.5pt;
  }
  .main-table thead tr {
    background: #1a3a5c;
    color: white;
  }
  .main-table thead th {
    padding: 2.5mm 3mm;
    text-align: left;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .main-table thead th.right { text-align: right; }
  .main-table tbody tr:nth-child(even) { background: #f5f8fb; }
  .main-table tbody tr { border-bottom: 0.5px solid #e2e8f0; }
  .main-table td {
    padding: 2mm 3mm;
    vertical-align: middle;
  }
  .item-label { font-weight: 500; }
  .item-base  { text-align: right; color: #444; }
  .item-rate  { text-align: right; color: #444; }
  .item-amount { text-align: right; font-weight: 600; }
  .item-amount.gain  { color: #166534; }
  .item-amount.deduct { color: #991b1b; }
  .item-amount.empty { }
  .section-header td {
    background: #eef2f7 !important;
    font-weight: 700;
    font-size: 8pt;
    text-transform: uppercase;
    color: #1a3a5c;
    letter-spacing: 0.3px;
    padding: 1.5mm 3mm;
    border-top: 1px solid #c4cfda;
  }

  /* ── Bases de calcul ── */
  .bases-section {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 2mm;
    margin-bottom: 4mm;
  }
  .base-box {
    border: 1px solid #d0d7de;
    border-radius: 3px;
    padding: 2mm 3mm;
    text-align: center;
    background: #f8fafc;
  }
  .base-box.highlight {
    border-color: #1a3a5c;
    background: #eef2f7;
  }
  .base-box .base-lbl {
    display: block;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 1mm;
  }
  .base-box .base-val {
    display: block;
    font-size: 10pt;
    font-weight: 700;
    color: #1a3a5c;
  }
  .base-box .base-sub {
    display: block;
    font-size: 7pt;
    color: #888;
    margin-top: 0.5mm;
  }

  /* ── Cotisations patronales ── */
  .er-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 4mm;
  }
  .er-table thead tr { background: #2d6a4f; color: white; }
  .er-table thead th {
    padding: 2mm 3mm;
    text-align: left;
    font-size: 8pt;
  }
  .er-table thead th.right { text-align: right; }
  .er-table tbody td { padding: 1.8mm 3mm; border-bottom: 0.5px solid #e2e8f0; }
  .er-table tbody tr:nth-child(even) { background: #f0faf4; }
  .er-table .right { text-align: right; }
  .er-total td { font-weight: 700; background: #d1fae5 !important; }

  /* ── Récapitulatif ── */
  .recap-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1a3a5c;
    color: white;
    border-radius: 4px;
    padding: 3mm 5mm;
    margin-bottom: 4mm;
  }
  .recap-item { text-align: center; }
  .recap-lbl { font-size: 7.5pt; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 1mm; }
  .recap-val { font-size: 12pt; font-weight: 700; }
  .recap-item.net { }
  .recap-item.net .recap-val { font-size: 15pt; color: #7dd3fc; }
  .recap-divider { width: 1px; background: rgba(255,255,255,0.2); height: 30px; }

  /* ── Infos IR ── */
  .ir-box {
    border: 1px solid #fca5a5;
    background: #fef2f2;
    border-radius: 3px;
    padding: 2mm 4mm;
    margin-bottom: 4mm;
    font-size: 8pt;
  }
  .ir-box-title { font-weight: 700; color: #991b1b; margin-bottom: 1.5mm; font-size: 8.5pt; }
  .ir-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
  .ir-row .val { font-weight: 600; }

  /* ── Footer ── */
  .footer {
    margin-top: auto;
    border-top: 1px solid #d0d7de;
    padding-top: 3mm;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #888;
  }
  .signature-block {
    display: flex;
    justify-content: space-between;
    margin-top: 8mm;
    font-size: 8pt;
  }
  .sig-box {
    border-top: 1px solid #aaa;
    padding-top: 2mm;
    text-align: center;
    width: 60mm;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── EN-TÊTE ── -->
  <div class="header">
    <div class="header-company">
      <div class="company-name">${company.name}</div>
      <div class="company-info">
        ${company.address ? company.address + "<br>" : ""}
        ${company.city || ""}${company.ice ? " — ICE : " + company.ice : ""}${company.cnssNum ? " — CNSS : " + company.cnssNum : ""}
        ${company.phone ? "<br>Tél : " + company.phone : ""}${company.email ? " — " + company.email : ""}
      </div>
    </div>
    <div class="header-title">
      <div class="bulletin-title">Bulletin de Paie</div>
      <div class="bulletin-period">${period.label}</div>
    </div>
  </div>

  <!-- ── INFOS EMPLOYÉ / ENTREPRISE ── -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Informations Employé</div>
      <div class="info-row"><span class="lbl">Nom Complet</span><span class="val">${employee.firstName} ${employee.lastName}</span></div>
      ${employee.matricule ? `<div class="info-row"><span class="lbl">Matricule</span><span class="val">${employee.matricule}</span></div>` : ""}
      ${employee.cin ? `<div class="info-row"><span class="lbl">CIN</span><span class="val">${employee.cin}</span></div>` : ""}
      ${employee.cnssNum ? `<div class="info-row"><span class="lbl">N° CNSS</span><span class="val">${employee.cnssNum}</span></div>` : ""}
      ${employee.position ? `<div class="info-row"><span class="lbl">Poste</span><span class="val">${employee.position}</span></div>` : ""}
      ${employee.department ? `<div class="info-row"><span class="lbl">Département</span><span class="val">${employee.department}</span></div>` : ""}
      <div class="info-row"><span class="lbl">Type Contrat</span><span class="val">${employee.contractType || "—"}</span></div>
    </div>
    <div class="info-box">
      <div class="info-box-title">Paramètres Paie</div>
      <div class="info-row"><span class="lbl">Période</span><span class="val">${period.label}</span></div>
      <div class="info-row"><span class="lbl">Jours déclarés</span><span class="val">${declaredDays || 26} jours</span></div>
      <div class="info-row"><span class="lbl">Salaire de Base</span><span class="val">${fmtMoney(baseSalary)} MAD</span></div>
      <div class="info-row"><span class="lbl">Plafond CNSS</span><span class="val">${fmtMoney(cnssCeiling)} MAD/mois</span></div>
      <div class="info-row"><span class="lbl">Frais Prof. (20%)</span><span class="val">${fmtMoney(profExpenses)} MAD</span></div>
    </div>
  </div>

  <!-- ── TABLEAU PRINCIPAL GAINS & RETENUES ── -->
  <table class="main-table">
    <thead>
      <tr>
        <th style="width:38%">DÉSIGNATION</th>
        <th class="right" style="width:15%">BASE</th>
        <th class="right" style="width:12%">TAUX</th>
        <th class="right" style="width:17%">GAINS</th>
        <th class="right" style="width:18%">RETENUES</th>
      </tr>
    </thead>
    <tbody>
      <!-- GAINS -->
      <tr class="section-header"><td colspan="5">Éléments de Rémunération</td></tr>
      ${gainRows}
      <!-- RETENUES -->
      <tr class="section-header"><td colspan="5">Cotisations &amp; Retenues Salariales</td></tr>
      ${deductionRows.join("")}
      ${otherDeductRows}
      <!-- TOTAUX -->
      <tr style="background:#f0f4f8;font-weight:700;border-top:2px solid #1a3a5c;">
        <td>TOTAUX</td>
        <td></td>
        <td></td>
        <td class="item-amount gain">${fmtMoney(grossSalary)}</td>
        <td class="item-amount deduct">${fmtMoney(totalDeductions)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ── BASES DE CALCUL ── -->
  <div class="bases-section">
    <div class="base-box highlight">
      <span class="base-lbl">Brut Global</span>
      <span class="base-val">${fmtMoney(grossSalary)}</span>
      <span class="base-sub">Somme des gains</span>
    </div>
    <div class="base-box">
      <span class="base-lbl">Base CNSS</span>
      <span class="base-val">${fmtMoney(cnssBase)}</span>
      <span class="base-sub">Plaf. ${fmtMoney(cnssCeiling)} MAD</span>
    </div>
    <div class="base-box">
      <span class="base-lbl">Base AMO</span>
      <span class="base-val">${fmtMoney(amoGross)}</span>
      <span class="base-sub">Sans plafond</span>
    </div>
    <div class="base-box">
      <span class="base-lbl">Base IR</span>
      <span class="base-val">${fmtMoney(incomeTaxBase)}</span>
      <span class="base-sub">Brut - cotis. - FP</span>
    </div>
    <div class="base-box">
      <span class="base-lbl">Total Retenues</span>
      <span class="base-val" style="color:#991b1b">${fmtMoney(totalDeductions)}</span>
      <span class="base-sub">Cotis. + IR + autres</span>
    </div>
  </div>

  ${incomeTaxAmount > 0 ? `
  <!-- ── DÉTAIL IR ── -->
  <div class="ir-box">
    <div class="ir-box-title">Détail Calcul IR (Impôt sur le Revenu)</div>
    <div class="ir-row"><span>Brut imposable (éléments taxables)</span><span class="val">${fmtMoney(snapshotData?.bases?.taxableGrossRaw)} MAD</span></div>
    <div class="ir-row"><span>— Cotisations salariales (CNSS + AMO + CIMR)</span><span class="val">${fmtMoney(totalEmpCharges)} MAD</span></div>
    <div class="ir-row"><span>— Frais professionnels (20%, plaf. 2 500 MAD)</span><span class="val">${fmtMoney(profExpenses)} MAD</span></div>
    <div class="ir-row" style="font-weight:700;border-top:1px solid #fca5a5;padding-top:1mm;margin-top:1mm"><span>= Revenu Net Imposable</span><span class="val" style="color:#991b1b">${fmtMoney(incomeTaxBase)} MAD</span></div>
    <div class="ir-row" style="font-weight:700"><span>IR calculé (barème progressif)</span><span class="val" style="color:#991b1b">${fmtMoney(incomeTaxAmount)} MAD</span></div>
  </div>
  ` : ""}

  <!-- ── RÉCAPITULATIF NET ── -->
  <div class="recap-bar">
    <div class="recap-item">
      <div class="recap-lbl">Salaire Brut</div>
      <div class="recap-val">${fmtMoney(grossSalary)} MAD</div>
    </div>
    <div class="recap-divider"></div>
    <div class="recap-item">
      <div class="recap-lbl">Total Retenues</div>
      <div class="recap-val">${fmtMoney(totalDeductions)} MAD</div>
    </div>
    <div class="recap-divider"></div>
    <div class="recap-item net">
      <div class="recap-lbl">NET À PAYER</div>
      <div class="recap-val">${fmtMoney(netSalary)} MAD</div>
    </div>
  </div>

  <!-- ── COTISATIONS PATRONALES ── -->
  <table class="er-table">
    <thead>
      <tr>
        <th>COTISATIONS PATRONALES</th>
        <th class="right">BASE</th>
        <th class="right">TAUX</th>
        <th class="right">MONTANT</th>
      </tr>
    </thead>
    <tbody>
      ${erRows}
      <tr class="er-total">
        <td>Total Charges Patronales</td>
        <td class="right"></td>
        <td class="right"></td>
        <td class="right">${fmtMoney(employerChargesTotal)} MAD</td>
      </tr>
    </tbody>
  </table>

  <!-- ── SIGNATURES ── -->
  <div class="signature-block">
    <div class="sig-box">Cachet &amp; Signature Employeur</div>
    <div class="sig-box">Signature Employé<br><small style="color:#888">(Reçu le salaire)</small></div>
  </div>

  <!-- ── FOOTER ── -->
  <div class="footer">
    <span>Bulletin généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
    <span>Confidentiel — Document officiel de paie</span>
    <span>${company.name} — ${period.label}</span>
  </div>

</div>
</body>
</html>`;
}

// ─── Fonction principale d'export ────────────────────────────────────────────
/**
 * Génère le PDF du bulletin pour un payslipId donné.
 * Retourne un Buffer PDF prêt à envoyer en réponse HTTP.
 */
export async function generatePayslipPdf(payslipId) {
  // ── 1. Charger le bulletin avec toutes les relations ──────────────────────
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          department: true,
          position: { select: { title: true, name: true } },
          contracts: {
            where: { status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      },
      company: true,
      payrollPeriod: true,
      payrollItems: { orderBy: { sortOrder: "asc" } },
      contributions: { orderBy: { code: "asc" } },
    },
  });

  if (!payslip) throw { status: 404, message: "Bulletin de paie introuvable" };

  const emp = payslip.employee;
  const co  = payslip.company;
  const per = payslip.payrollPeriod;
  const snap = payslip.snapshotData || {};

  // ── 2. Séparer gains et retenues ─────────────────────────────────────────
  const gainItems = payslip.payrollItems.filter(i =>
    Number(i.amount) > 0 &&
    !["CNSS", "AMO", "TAX", "OTHER", "ADVANCE", "DEDUCTION"].includes(i.itemType)
  );
  // Include statutory deductions that are labelled separately
  const deductionItems = payslip.payrollItems.filter(i =>
    Number(i.amount) < 0 &&
    !["CNSS", "AMO", "TAX"].includes(i.itemType)
  );

  // ── 3. Construire l'objet data pour le template ───────────────────────────
  const data = {
    employee: {
      firstName:    emp.firstName,
      lastName:     emp.lastName,
      matricule:    emp.matricule || emp.employeeCode || "—",
      cin:          emp.cin || null,
      cnssNum:      emp.cnssNumber || null,
      position:     emp.position?.title || emp.position?.name || null,
      department:   emp.department?.name || null,
      contractType: emp.contracts?.[0]?.contractType || null,
    },
    company: {
      name:     co.name,
      address:  co.address || "",
      city:     co.city || "",
      phone:    co.phone || "",
      email:    co.email || "",
      ice:      co.ice || null,
      cnssNum:  co.cnssNumber || null,
    },
    period: {
      label:  fmtPeriod(per.year, per.month),
      year:   per.year,
      month:  per.month,
    },
    baseSalary:          Number(payslip.grossSalary) - Number(payslip.totalAllowances) - Number(payslip.totalBonuses),
    grossSalary:         Number(payslip.grossSalary),
    netSalary:           Number(payslip.netSalary),
    cnssBase:            Number(payslip.cnssBase),
    amoGross:            Number(payslip.amoBase),
    taxableGross:        Number(payslip.taxableGross),
    cnssEmpAmount:       Number(payslip.totalCnss),
    amoEmpAmount:        Number(payslip.employeeChargesTotal) - Number(payslip.totalCnss) - (snap.appliedRates?.cimrEmployee ? Number(payslip.grossSalary) * snap.appliedRates.cimrEmployee : 0),
    cimrEmpAmount:       snap.appliedRates?.cimrEmployee ? Number(payslip.grossSalary) * snap.appliedRates.cimrEmployee : 0,
    totalEmpCharges:     Number(payslip.employeeChargesTotal),
    incomeTaxBase:       Number(payslip.incomeTaxBase),
    incomeTaxAmount:     Number(payslip.incomeTaxAmount),
    totalDeductions:     Number(payslip.totalDeductions) + Number(payslip.incomeTaxAmount),
    employerChargesTotal: Number(payslip.employerChargesTotal),
    gainItems,
    deductionItems,
    contributions:       payslip.contributions,
    snapshotData:        snap,
    declaredDays:        payslip.declaredDays || 26,
  };

  // Recalculate baseSalary from snapshot for accuracy
  if (snap.baseSalary !== undefined) {
    data.baseSalary = Number(snap.baseSalary);
  }

  // ── 4. Générer le HTML ────────────────────────────────────────────────────
  const html = buildHtml(data);

  // ── 5. Puppeteer → PDF ────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}