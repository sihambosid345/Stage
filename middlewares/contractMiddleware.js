import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Middleware pour vérifier les contrats d'emploi
 * Vérifie que l'employé a un contrat actif et valide
 */
export const contractMiddleware = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.body?.employeeId;
    const companyId = req.params.companyId || req.body?.companyId || req.user?.companyId;

    if (!employeeId || !companyId) {
      return res.status(400).json({
        error: "Employee ID and Company ID are required",
      });
    }

    // Vérifier que l'employé existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true, status: true },
    });

    if (!employee || employee.companyId !== companyId) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Vérifier l'état de l'employé
    if (employee.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Employee is not active",
        status: employee.status,
      });
    }

    // Vérifier qu'il y a au moins un contrat actif
    const now = new Date();
    const activeContract = await prisma.employeeContract.findFirst({
      where: {
        employeeId,
        companyId,
        status: "ACTIVE",
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        contractType: true,
      },
    });

    if (!activeContract) {
      return res.status(403).json({
        error: "Employee has no active contract",
        employeeStatus: employee.status,
      });
    }

    // Stocker les infos du contrat dans la requête
    req.contract = activeContract;
    next();
  } catch (error) {
    console.error("Contract middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
