import { prisma } from "../prismaClient.js";
export const createPosition = async (data) => {
  return await prisma.position.create({ data });
};

export const getPositions = async () => {
  return await prisma.position.findMany();
};

export const getPositionById = async (id) => {
  const position = await prisma.position.findUnique({ where: { id } });
  if (!position) throw { status: 404, message: "Position not found" };
  return position;
};

export const updatePosition = async (id, data) => {
  await getPositionById(id);
  return await prisma.position.update({ where: { id }, data });
};

export const deletePosition = async (id) => {
  await getPositionById(id);
  await prisma.position.delete({ where: { id } });
};