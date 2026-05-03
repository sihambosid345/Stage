// CORRIGÉ: utilise l'instance prisma partagée au lieu de new PrismaClient()
import { prisma } from "../lib/prisma.js";

/**
 * Middleware pour vérifier la validité de la licence de l'entreprise.
 * Ignoré pour les super admins.
 * Auto-expire licenses when end date passes.
 */
export const licenseMiddleware = async (req, res, next) => {
  try {
    // Super admins contournent la vérification de licence
    if (req.user?.isSuperAdmin || req.user?.role === "SUPER_ADMIN") {
      return next();
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "Utilisateur sans entreprise associée." });
    }

    let license = await prisma.license.findUnique({
      where: { companyId },
      select: { id: true, status: true, endsAt: true, maxUsers: true, maxEmployees: true },
    });

    if (!license) {
      return res.status(403).json({
        error: "Cette entreprise ne possède pas de licence. Contactez le super administrateur.",
        licenseStatus: "NO_LICENSE",
      });
    }

    const now = new Date();
    const isExpired      = license.endsAt && license.endsAt < now;
    
    // Auto-update license status to EXPIRED if end date has passed
    if (isExpired && license.status !== 'EXPIRED') {
      license = await prisma.license.update({
        where: { id: license.id },
        data: { status: 'EXPIRED' },
        select: { id: true, status: true, endsAt: true, maxUsers: true, maxEmployees: true },
      });
    }
    
    const isInvalidStatus = !["ACTIVE", "TRIAL"].includes(license.status);

    if (isExpired || isInvalidStatus) {
      return res.status(403).json({
        error: "Votre licence est expirée ou inactive. Contactez le super administrateur.",
        licenseStatus: license.status,
        expiresAt: license.endsAt,
      });
    }

    // Rend les infos de licence disponibles pour les controllers
    req.license = license;
    next();
  } catch (error) {
    console.error("License middleware error:", error);
    res.status(500).json({ error: "Erreur interne lors de la vérification de la licence." });
  }
};