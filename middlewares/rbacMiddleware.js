/**
 * Middleware pour vérifier les rôles et permissions
 * Contrôle l'accès basé sur les rôles (RBAC)
 */
export const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const isSuperAdmin = req.user?.isSuperAdmin || userRole === "SUPER_ADMIN";

      // Les super admins ont accès à tout
      if (isSuperAdmin) {
        return next();
      }

      // Vérifier si le rôle de l'utilisateur est autorisé
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: "Access denied",
          message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
          userRole: userRole,
        });
      }

      next();
    } catch (error) {
      console.error("Role middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware pour vérifier les permissions spécifiques
 */
export const permissionMiddleware = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const userPermissions = req.user?.permissions || [];
      const userRole = req.user?.role;
      const isSuperAdmin = req.user?.isSuperAdmin || userRole === "SUPER_ADMIN";

      // Les super admins ont toutes les permissions
      if (isSuperAdmin) {
        return next();
      }

      // Vérifier si l'utilisateur a la permission
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: "Permission denied",
          message: `This action requires the permission: ${requiredPermission}`,
          requiredPermission: requiredPermission,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};
