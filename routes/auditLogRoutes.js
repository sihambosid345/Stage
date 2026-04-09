import express from "express";
import * as controller from "../controllers/auditLogController.js";

const router = express.Router();

router.post("/", controller.createLog);
router.get("/", controller.getLogs);
router.get("/company/:companyId", controller.getLogsByCompany);
router.get("/:id", controller.getLog);
router.delete("/:id", controller.deleteLog);

export default router;