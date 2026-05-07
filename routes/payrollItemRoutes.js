import express from "express";
import * as controller from "../controllers/payrollItemController.js";

const router = express.Router();

router.post("/", controller.createItem);
router.get("/", controller.getItems);
router.get("/run/:runId", controller.getItemsByRun);
router.get("/employee/:employeeId", controller.getItemsByEmployee);
router.get("/:id", controller.getItem);
router.put("/:id", controller.updateItem);
router.delete("/:id", controller.deleteItem);

export default router;