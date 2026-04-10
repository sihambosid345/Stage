import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) throw new Error("JWT_SECRET manquant dans .env");

export const login = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error("Email et mot de passe requis.");
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true, companyId: true, firstName: true, lastName: true,
      fullName: true, email: true, phone: true, role: true,
      status: true, passwordHash: true, lastLoginAt: true,
      company: { select: { id: true, name: true, status: true } },
    },
  });

  const INVALID = "Email ou mot de passe incorrect.";

  if (!user) { const e = new Error(INVALID); e.status = 401; throw e; }

  if (user.status !== "ACTIVE") {
    const e = new Error(`Compte ${user.status.toLowerCase()}. Contactez l'administrateur.`);
    e.status = 403; throw e;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { const e = new Error(INVALID); e.status = 401; throw e; }

  prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

  const token = jwt.sign(
    { sub: user.id, companyId: user.companyId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const { passwordHash: _, ...publicUser } = user;
  return { token, user: publicUser };
};

export const hashPassword = async (plainPassword) => {
  // Minimum 4 caractères
  if (!plainPassword || plainPassword.length < 4) {
    const err = new Error("Mot de passe trop court (min. 4 caractères).");
    err.status = 400; throw err;
  }
  return bcrypt.hash(plainPassword, 12);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const e = new Error(
      err.name === "TokenExpiredError" ? "Session expirée. Reconnectez-vous." : "Token invalide."
    );
    e.status = 401; throw e;
  }
};