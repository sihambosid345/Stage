// controllers/authController.js
import * as authService from "../services/authService.js";

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { token, user }
 */
export const loginController = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
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
  res.json({ user: req.user });
};
