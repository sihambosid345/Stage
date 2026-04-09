// routes/authRoutes.js
import { Router } from "express";
import { loginController, logoutController, meController } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// POST /auth/login   — public
router.post("/login", loginController);

// POST /auth/logout  — protégé (pour audit log éventuel)
router.post("/logout", authenticate, logoutController);

// GET  /auth/me      — retourne l'utilisateur connecté
router.get("/me", authenticate, meController);

export default router;
