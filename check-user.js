import { prisma } from './lib/prisma.js';

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'siham@gmail.com' },
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

checkUser().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
