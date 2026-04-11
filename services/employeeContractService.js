import { prisma } from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
};

const parseDates = (data) => ({
  ...data,
  startDate: data.startDate ? new Date(data.startDate) : undefined,
  endDate: data.endDate ? new Date(data.endDate) : undefined,
});

export const createContract = async (data) => {
  return await prisma.employeeContract.create({
    data: parseDates(data), // ✅ fix
    include: includeRelations,
  });
};

export const getContracts = async () => {
  return await prisma.employeeContract.findMany({ include: includeRelations });
};

export const getContractById = async (id) => {
  const contract = await prisma.employeeContract.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!contract) throw { status: 404, message: "Contract not found" };
  return contract;
};

export const getContractsByEmployee = async (employeeId) => {
  return await prisma.employeeContract.findMany({
    where: { employeeId },
    include: includeRelations,
  });
};

export const updateContract = async (id, data) => {
  await getContractById(id);
  return await prisma.employeeContract.update({
    where: { id },
    data: parseDates(data), // ✅ fix
    include: includeRelations,
  });
};

export const deleteContract = async (id) => {
  await getContractById(id);
  await prisma.employeeContract.delete({ where: { id } });
};