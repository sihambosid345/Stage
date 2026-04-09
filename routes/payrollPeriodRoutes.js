import express from "express";
import * as controller from "../controllers/payrollPeriodController.js";

const router = express.Router();

router.post("/", controller.createPeriod);
router.get("/", controller.getPeriods);
router.get("/:id", controller.getPeriod);
router.put("/:id", controller.updatePeriod);
router.delete("/:id", controller.deletePeriod);

export default router;