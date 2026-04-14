import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

export const createPosition = async (data) => {
  return await prisma.position.create({ data, include: includeRelations });
};

export const getPositions = async () => {
  return await prisma.position.findMany({ include: includeRelations });
};

export const getPositionById = async (id) => {
  const position = await prisma.position.findUnique({ where: { id }, include: includeRelations });
  if (!position) throw { status: 404, message: "Position not found" };
  return position;
};

export const updatePosition = async (id, data) => {
  await getPositionById(id);
  return await prisma.position.update({ where: { id }, data, include: includeRelations });
};

export const deletePosition = async (id) => {
  await getPositionById(id);
  await prisma.position.delete({ where: { id } });
};