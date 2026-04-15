import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Middleware pour vérifier la validité de la licence
 * Vérifie que l'entreprise a une licence active et valide
 */
export const licenseMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    // Les super admins n'ont pas besoin de vérifier la licence
    if (req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    const companyId = req.params.companyId || req.body?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        error: "Company ID is required",
      });
    }

    // Vérifier que l'entreprise existe et a une licence valide
    const license = await prisma.license.findUnique({
      where: { companyId },
      select: {
        id: true,
        status: true,
        endsAt: true,
        maxUsers: true,
        maxEmployees: true,
      },
    });

    // Si aucune licence trouvée
    if (!license) {
      return res.status(403).json({
        error: "Company has no valid license",
        licenseStatus: "NO_LICENSE",
      });
    }

    // Vérifier le statut de la licence
    const now = new Date();
    const isExpired = license.endsAt && license.endsAt < now;
    const isInvalidStatus = !["ACTIVE", "TRIAL"].includes(license.status);

    if (isExpired || isInvalidStatus) {
      return res.status(403).json({
        error: "License is expired or inactive",
        licenseStatus: license.status,
        expiresAt: license.endsAt,
      });
    }

    // Stocker les informations de licence dans la requête
    req.license = license;
    next();
  } catch (error) {
    console.error("License middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
