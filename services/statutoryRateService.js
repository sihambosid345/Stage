import { prisma } from "../prismaClient.js";

export const getCurrentRate = async (code, effectiveDate = new Date()) => {
  return await prisma.statutoryRate.findFirst({
    where: {
      code,
      effectiveFrom: { lte: effectiveDate },
      OR: [
        { effectiveTo: { gte: effectiveDate } },
        { effectiveTo: null }
      ],
      isActive: true
    }
  });
};

export const getAllRates = async (companyId = null) => {
  return await prisma.statutoryRate.findMany({
    where: {
      OR: [
        { companyId },
        { companyId: null } // Taux nationaux
      ],
      isActive: true
    },
    orderBy: [{ code: "asc" }, { effectiveFrom: "desc" }]
  });
};

export const getCnssRates = async (effectiveDate = new Date()) => {
  const rates = await prisma.statutoryRate.findMany({
    where: {
      code: {
        in: ["CNSS_EMPLOYEE", "CNSS_EMPLOYER", "AMO_EMPLOYEE", "AMO_EMPLOYER"]
      },
      effectiveFrom: { lte: effectiveDate },
      OR: [
        { effectiveTo: { gte: effectiveDate } },
        { effectiveTo: null }
      ],
      isActive: true
    }
  });
  return rates;
};