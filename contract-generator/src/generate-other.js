import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function registerHelpers(Handlebars) {
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
}

const testDataOther = {
  contract: {
    id: "CT-2026-0099",
    type: "OTHER",
    status: "DRAFT",
    startDate: new Date("2026-05-01"),
    baseSalary: 8000,
  },
  employee: {
    firstName: "Test",
    lastName: "USER",
    email: "test@example.com",
    phone: "+212 6 00 00 00 00",
  },
  company: {
    name: "TECH MAROC SARL",
    address: "123, Boulevard Hassan II",
    city: "Casablanca",
  },
};

export async function generateContratOther(data) {
  const { default: Handlebars } = await import("handlebars");
  const { default: puppeteer } = await import("puppeteer");

  registerHelpers(Handlebars);

  const templatePath = path.join(__dirname, "..", "templates", "contrat-other.hbs");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template introuvable : ${templatePath}`);
  }

  const source = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(source);
  const html = template(data);

  const outputDir = path.join(__dirname, "..", "generated-pdfs");
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = `contrat-other-${data.contract.id}-${Date.now()}.pdf`;
  const pdfPath = path.join(outputDir, filename);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  return pdfPath;
}

async function main() {
  console.log("📄 Génération du contrat OTHER...");
  try {
    const pdfPath = await generateContratOther(testDataOther);
    console.log(`✅ OTHER généré : ${pdfPath}`);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) main();