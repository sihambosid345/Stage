import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Middleware pour vérifier l'accès à une entreprise
 * Vérifie que l'utilisateur a accès à l'entreprise demandée
 */
export const companyMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const companyId = req.params.companyId || req.body?.companyId;

    // Les super admins peuvent accéder à toutes les entreprises
    if (req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    // L'utilisateur doit avoir une companyId
    if (!companyId) {
      return res.status(400).json({
        error: "Company ID is required",
      });
    }

    // Vérifier que l'utilisateur appartient à cette entreprise
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user || user.companyId !== companyId) {
      return res.status(403).json({
        error: "Access denied to this company",
      });
    }

    next();
  } catch (error) {
    console.error("Company middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
