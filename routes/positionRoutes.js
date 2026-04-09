import express from "express";
import * as controller from "../controllers/positionController.js";

const router = express.Router();

router.post("/", controller.createPosition);
router.get("/", controller.getPositions);
router.get("/:id", controller.getPosition);
router.put("/:id", controller.updatePosition);
router.delete("/:id", controller.deletePosition);

export default router;