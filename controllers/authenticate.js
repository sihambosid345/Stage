// middlewares/authenticate.js
import { verifyToken } from "../services/authService.js";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware principal — vérifie le JWT sur chaque requête protégée.
 * Injecte req.user avec les données complètes depuis la DB.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token manquant. Veuillez vous connecter." });
    }

    const token   = authHeader.slice(7);
    const payload = verifyToken(token);  // lance une erreur si invalide/expiré

    // Recharge l'utilisateur depuis la DB à chaque requête
    // (détecte les changements de statut, suppression, etc.)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id:          true,
        companyId:   true,
        firstName:   true,
        lastName:    true,
        email:       true,
        role:        true,
        isSuperAdmin: true,
        permissions: true,
        status:      true,
        company:     { select: { id: true, name: true, status: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: `Compte ${user.status.toLowerCase()}.` });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(error.status || 401).json({ error: error.message });
  }
};

/**
 * Middleware complémentaire — à appliquer APRÈS authenticate.
 * Vérifie que l'utilisateur a le rôle ADMIN.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès refusé. Rôle ADMIN requis." });
  }
  next();
};

/**
 * Middleware complémentaire — vérifie que l'utilisateur appartient
 * à la même company que la ressource demandée.
 * Usage: router.get("/:id", authenticate, requireSameCompany, controller)
 */
export const requireSameCompany = (companyIdExtractor) => (req, res, next) => {
  const companyId = typeof companyIdExtractor === "function"
    ? companyIdExtractor(req)
    : req.params.companyId || req.body.companyId;

  if (companyId && req.user.companyId !== companyId) {
    return res.status(403).json({ error: "Accès refusé à cette entreprise." });
  }
  next();
};