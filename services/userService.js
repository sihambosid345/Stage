import prisma from "../prismaClient.js";
import crypto from "crypto";

const includeRelations = {
  company: { select: { id: true, name: true } },
};

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

export const createUser = async (data) => {
  const { password, ...rest } = data;
  return await prisma.user.create({
    data: { ...rest, passwordHash: hashPassword(password) },
    include: includeRelations,
  });
};

export const getUsers = async () => {
  return await prisma.user.findMany({
    include: includeRelations,
    omit: { passwordHash: true },
  });
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: includeRelations,
    omit: { passwordHash: true },
  });
  if (!user) throw { status: 404, message: "User not found" };
  return user;
};

export const updateUser = async (id, data) => {
  await getUserById(id);
  const { password, ...rest } = data;
  const updateData = password
    ? { ...rest, passwordHash: hashPassword(password) }
    : rest;
  return await prisma.user.update({
    where: { id },
    data: updateData,
    include: includeRelations,
    omit: { passwordHash: true },
  });
};

export const deleteUser = async (id) => {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
};