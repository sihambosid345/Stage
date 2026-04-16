import express from "express";
import * as controller from "../controllers/userController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { roleMiddleware } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

// Lecture : tout utilisateur authentifié peut voir la liste de sa company
router.get("/",          authenticate, controller.getUsers);
router.get("/:id",       authenticate, controller.getUser);

// Mutations : ADMIN ou SUPER_ADMIN seulement
router.post("/",         authenticate, roleMiddleware(["ADMIN", "SUPER_ADMIN"]), controller.createUser);
router.put("/:id",       authenticate, roleMiddleware(["ADMIN", "SUPER_ADMIN"]), controller.updateUser);
router.delete("/:id",    authenticate, roleMiddleware(["ADMIN", "SUPER_ADMIN"]), controller.deleteUser);

export default router;