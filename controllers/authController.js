// controllers/authController.js
import * as authService from "../services/authService.js";
import * as auditLogService from "../services/auditLogService.js";

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { token, user }
 */
export const loginController = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    
    const response = {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isSuperAdmin: result.user.isSuperAdmin || result.user.role === 'SUPER_ADMIN',
        companyId: result.user.companyId,
        status: result.user.status,
        permissions: result.user.permissions || []
      }
    };

    if (result.user.companyId) {
      await auditLogService.logAction({
        req,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: result.user.id,
        companyId: result.user.companyId,
        description: `Connexion de l\'utilisateur ${result.user.email}`,
        metadata: { email: result.user.email }
      });
    } else {
      console.warn('Audit log skipped for login because companyId is missing:', result.user.email);
    }

    res.json(response);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

/**
 * POST /auth/logout
 * (JWT est stateless — le client supprime son token)
 * Optionnel : peut être utilisé pour audit log
 */
export const logoutController = async (req, res) => {
  res.json({ message: "Déconnexion réussie." });
};

/**
 * GET /auth/me
 * Retourne l'utilisateur courant depuis le token
 */
export const meController = async (req, res) => {
  // req.user est injecté par le middleware authenticate
  const user = req.user;
  res.json({ 
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || user.role === 'SUPER_ADMIN', // ← AJOUTER
      companyId: user.companyId,
      status: user.status,
      permissions: user.permissions || []
    }
  });
};