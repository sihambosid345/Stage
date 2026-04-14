import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const ADMIN = {
  email:     process.env.ADMIN_EMAIL    || "samira@gmail.com",
  password:  process.env.ADMIN_PASSWORD || "123456",
  firstName: "Entr",
  lastName:  "Admin",
  role:      "ADMIN",
  status:    "ACTIVE",
};

const SUPER_ADMIN = {
  email:     process.env.SUPER_ADMIN_EMAIL    || "siham@gmail.com",
  password:  process.env.SUPER_ADMIN_PASSWORD || "123456",
  firstName: "Super",
  lastName:  "Admin",
  role:      "SUPER_ADMIN",
  status:    "ACTIVE",
};

async function seedSuperAdmin() {
  console.log("\n📌 Création du Super Admin...");
  
  const existing = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN.email },
  });

  if (existing) {
    if (existing.isSuperAdmin) {
      if (existing.role !== "SUPER_ADMIN") {
        // Normaliser le rôle si l'utilisateur a déjà les droits de super admin
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: "SUPER_ADMIN",
            permissions: ["all"],
          },
        });
      }
      console.log("✓ Super admin existe déjà");
      return await prisma.user.findUnique({ where: { id: existing.id } });
    } else {
      // Convertir l'utilisateur existant en super admin
      const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
          status: "ACTIVE",
          companyId: null, // Super admin n'a pas de companyId
          permissions: ["all"],
        },
      });
      console.log("✓ Super admin mis à jour");
      console.log(`  Email    : ${updated.email}`);
      console.log(`  Password : ${SUPER_ADMIN.password}`);
      return updated;
    }
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);
  const user = await prisma.user.create({
    data: {
      email:        SUPER_ADMIN.email,
      firstName:    SUPER_ADMIN.firstName,
      lastName:     SUPER_ADMIN.lastName,
      fullName:     `${SUPER_ADMIN.firstName} ${SUPER_ADMIN.lastName}`,
      passwordHash,
      role:         "SUPER_ADMIN",
      isSuperAdmin: true,
      status:       "ACTIVE",
      permissions:  ["all"],
    },
  });

  console.log("✓ Super admin créé avec succès");
  console.log(`  Email    : ${user.email}`);
  console.log(`  Password : ${SUPER_ADMIN.password}`);
  console.log(`  ID       : ${user.id}`);
  
  return user;
}

async function seedCompanyAdmin() {
  console.log("\n📌 Création de l'Admin d'Entreprise...");
  
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("⚠ Aucune entreprise trouvée. Créez d'abord une company.");
    return null;
  }

  const existing = await prisma.user.findFirst({
    where: { email: ADMIN.email },
  });

  if (existing) {
    // Mise à jour du mot de passe si l'admin existe déjà
    const passwordHash = await bcrypt.hash(ADMIN.password, 12);
    await prisma.user.update({
      where: { id: existing.id },
      data: { 
        passwordHash, 
        status: "ACTIVE",
        role: "ADMIN",
        companyId: company.id,
        permissions: [
          "dashboard",
          "employees",
          "organisation",
          "attendance",
          "contracts",
          "payroll",
          "reports",
          "users"
        ],
      },
    });
    console.log("✓ Admin d'entreprise mis à jour");
    console.log(`  Email    : ${existing.email}`);
    console.log(`  Password : ${ADMIN.password}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);
  const user = await prisma.user.create({
    data: {
      companyId:    company.id,
      email:        ADMIN.email,
      firstName:    ADMIN.firstName,
      lastName:     ADMIN.lastName,
      fullName:     `${ADMIN.firstName} ${ADMIN.lastName}`,
      passwordHash,
      role:         "ADMIN",
      status:       ADMIN.status,
      permissions:  [
        "dashboard",
        "employees",
        "organisation",
        "attendance",
        "contracts",
        "payroll",
        "reports",
        "users"
      ],
    },
  });

  console.log("✓ Admin d'entreprise créé avec succès");
  console.log(`  Email    : ${user.email}`);
  console.log(`  Password : ${ADMIN.password}`);
  console.log(`  Company  : ${company.name}`);
  console.log(`  ID       : ${user.id}`);
  
  return user;
}

async function seed() {
  try {
    console.log("\n🚀 Démarrage du seed d'administration...\n");
    
    // Créer le Super Admin
    await seedSuperAdmin();
    
    // Créer l'Admin d'Entreprise
    await seedCompanyAdmin();
    
    console.log("\n✅ Seed d'administration terminé avec succès\n");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
}

seed()
  .catch((e) => { console.error("Erreur fatale:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());