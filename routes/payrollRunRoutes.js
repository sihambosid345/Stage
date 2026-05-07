import express from "express";
import * as controller from "../controllers/payrollRunController.js";

const router = express.Router();

router.post("/", controller.createRun);
router.get("/", controller.getRuns);
router.get("/period/:periodId", controller.getRunsByPeriod);
router.get("/:id", controller.getRun);
router.put("/:id", controller.updateRun);
router.delete("/:id", controller.deleteRun);

export default router;