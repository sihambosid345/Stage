

import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const ADMIN = {
  email:     process.env.ADMIN_EMAIL    || "siham@gmail.com",
  password:  process.env.ADMIN_PASSWORD || "1234",
  firstName: "Super",
  lastName:  "Admin",
  role:      "ADMIN",
  status:    "ACTIVE",
};

async function seed() {
  console.log(" Vérification admin existant...");
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error(" Aucune entreprise trouvée. Créez d'abord une company.");
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    where: { email: ADMIN.email },
  });

  if (existing) {
    console.log(` Admin déjà existant : ${existing.email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);

  const user = await prisma.user.create({
    data: {
      companyId:    company.id,
      email:        ADMIN.email,
      firstName:    ADMIN.firstName,
      lastName:     ADMIN.lastName,
      passwordHash,
      role:         ADMIN.role,
      status:       ADMIN.status,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Admin créé avec succès :");
  console.log(`   Email    : ${user.email}`);
  console.log(`   Password : ${ADMIN.password}`);
  console.log(`   ID       : ${user.id}`);
  console.log("\n⚠️  Changez le mot de passe après la première connexion !");
}

seed()
  .catch((e) => { console.error(" Erreur:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
