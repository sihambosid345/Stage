import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

try {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('No JWT_SECRET');

  const user = await prisma.user.findFirst({
    select: { id: true, email: true, role: true, isSuperAdmin: true, companyId: true },
    where: { role: 'SUPER_ADMIN' },
  });

  if (!user) throw new Error('No Super Admin user found');

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId },
    secret,
    { expiresIn: '1h' }
  );

  console.log(token);
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
