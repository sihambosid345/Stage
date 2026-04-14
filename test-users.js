import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { company: { select: { name: true } } },
  });

  console.log("=== ALL USERS ===");
  users.forEach(u => {
    console.log(
      `${u.firstName} ${u.lastName} | ${u.email} | Role: ${u.role} | SuperAdmin: ${u.isSuperAdmin} | Company: ${u.company?.name}`
    );
  });

  const singleCompanyUsers = users.filter(u => u.companyId === users[0]?.companyId && !u.isSuperAdmin);
  console.log("\n=== NON-SUPER-ADMIN USERS IN FIRST COMPANY ===");
  singleCompanyUsers.forEach(u => {
    console.log(`${u.firstName} ${u.lastName} | ${u.email}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
