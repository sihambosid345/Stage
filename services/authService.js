// services/authService.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) {
  throw new Error("❌  JWT_SECRET manquant dans .env");
}

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error("Email et mot de passe requis.");
    err.status = 400;
    throw err;
  }

  // Cherche l'utilisateur (n'importe quelle company)
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      companyId: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      passwordHash: true,   // ← champ interne, jamais renvoyé au client
      lastLoginAt: true,
      company: { select: { id: true, name: true, status: true } },
    },
  });

  // Même message pour email inexistant ou mot de passe faux (sécurité)
  const INVALID = "Email ou mot de passe incorrect.";

  if (!user) {
    const err = new Error(INVALID);
    err.status = 401;
    throw err;
  }

  // Compte bloqué ou inactif
  if (user.status !== "ACTIVE") {
    const err = new Error(`Compte ${user.status.toLowerCase()}. Contactez l'administrateur.`);
    err.status = 403;
    throw err;
  }

  // Vérification du mot de passe
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error(INVALID);
    err.status = 401;
    throw err;
  }

  // Mise à jour lastLoginAt (non bloquant)
  prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});

  // Payload JWT — données minimales
  const payload = {
    sub:       user.id,
    companyId: user.companyId,
    email:     user.email,
    role:      user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Retourne le token + infos publiques (sans passwordHash)
  const { passwordHash: _, ...publicUser } = user;

  return { token, user: publicUser };
};

// ─── Hashage mot de passe (utilisé dans userService) ─────────────────────────

export const hashPassword = async (plainPassword) => {
  if (!plainPassword || plainPassword.length < 6) {
    const err = new Error("Mot de passe trop court (min. 6 caractères).");
    err.status = 400;
    throw err;
  }
  return bcrypt.hash(plainPassword, 12);
};

// ─── Vérification token (utilisé par le middleware) ──────────────────────────

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const e = new Error(
      err.name === "TokenExpiredError" ? "Session expirée. Reconnectez-vous." : "Token invalide."
    );
    e.status = 401;
    throw e;
  }
};
