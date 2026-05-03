import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

/**
 * POST /auth/login
 * Body: { email, password }
 */
router.post("/login", authController.loginController);

/**
 * POST /auth/logout
 * (Optionnel - stateless)
 */
router.post("/logout", authController.logoutController);

/**
 * GET /auth/me
 * Retourne l'utilisateur connecté
 */
router.get("/me", authController.meController);

export default router;