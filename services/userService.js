// services/userService.js  (version mise à jour avec hashage)
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "./authService.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Champs publics — exclut toujours passwordHash */
const PUBLIC_SELECT = {
  id:          true,
  companyId:   true,
  firstName:   true,
  lastName:    true,
  fullName:    true,
  email:       true,
  phone:       true,
  role:        true,
  permissions: true,
  status:      true,
  lastLoginAt: true,
  createdAt:   true,
  updatedAt:   true,
  company: { select: { id: true, name: true } },
};

const notFound = () => { const e = new Error("Utilisateur introuvable."); e.status = 404; throw e; };

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export const createUser = async (data) => {
  const { password, permissions, ...rest } = data;

  if (!password) {
    const err = new Error("Le mot de passe est obligatoire.");
    err.status = 400;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      ...rest,
      email:        rest.email?.toLowerCase().trim(),
      permissions:  Array.isArray(permissions) ? permissions : [],
      passwordHash,
    },
    select: PUBLIC_SELECT,
  });
};

export const getUsers = async (companyId) =>
  prisma.user.findMany({
    where: companyId ? { companyId, isSuperAdmin: false } : {},
    select: PUBLIC_SELECT,
    orderBy: { createdAt: "desc" },
  });

export const getUserById = async (id, companyId) => {
  const where = companyId ? { id, companyId, isSuperAdmin: false } : { id };
  const user = await prisma.user.findFirst({ where, select: PUBLIC_SELECT });
  if (!user) notFound();
  return user;
};

export const updateUser = async (id, data, companyId) => {
  const { password, permissions, ...rest } = data;

  const updateData = { ...rest };
  if (rest.email) updateData.email = rest.email.toLowerCase().trim();
  if (Array.isArray(permissions)) updateData.permissions = permissions;

  // Si un nouveau mot de passe est fourni, on le hashe
  if (password) {
    updateData.passwordHash = await hashPassword(password);
  }

  const existing = await prisma.user.findFirst({ where: companyId ? { id, companyId } : { id } });
  if (!existing) notFound();

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: PUBLIC_SELECT,
  });

  return user;
};

export const deleteUser = async (id, companyId) => {
  const existing = await prisma.user.findFirst({ where: companyId ? { id, companyId } : { id } });
  if (!existing) notFound();
  await prisma.user.delete({ where: { id } });
};