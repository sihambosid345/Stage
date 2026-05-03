import { prisma } from "../prismaClient.js";

const includeRelations = {
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

export const createPosition = async (data) => {
  return await prisma.position.create({ data, include: includeRelations });
};

export const getPositions = async () => {
  return await prisma.position.findMany({ 
    include: includeRelations,
    orderBy: { name: "asc" }
  });
};

// ✅ NOUVEAU: Récupérer les postes par entreprise
export const getPositionsByCompany = async (companyId) => {
  return await prisma.position.findMany({
    where: { companyId },
    include: includeRelations,
    orderBy: { name: "asc" }
  });
};

// Récupérer les postes par département
export const getPositionsByDepartment = async (departmentId) => {
  return await prisma.position.findMany({
    where: { departmentId },
    include: includeRelations,
    orderBy: { name: "asc" }
  });
};

// ✅ NOUVEAU: Récupérer les postes par département ET entreprise
export const getPositionsByDepartmentAndCompany = async (departmentId, companyId) => {
  return await prisma.position.findMany({
    where: { 
      departmentId,
      companyId  // ✅ Filtrer aussi par entreprise
    },
    include: includeRelations,
    orderBy: { name: "asc" }
  });
};

export const getPositionById = async (id) => {
  const position = await prisma.position.findUnique({ 
    where: { id }, 
    include: includeRelations 
  });
  if (!position) throw { status: 404, message: "Position not found" };
  return position;
};

export const updatePosition = async (id, data) => {
  await getPositionById(id);
  return await prisma.position.update({ 
    where: { id }, 
    data, 
    include: includeRelations 
  });
};

export const deletePosition = async (id) => {
  await getPositionById(id);
  await prisma.position.delete({ where: { id } });
};