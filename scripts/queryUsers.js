import { prisma } from '../lib/prisma.js';

async function run() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        permissions: true,
        companyId: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();