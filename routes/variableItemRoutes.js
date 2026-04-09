import express from "express";
import * as controller from "../controllers/variableItemController.js";

const router = express.Router();

router.post("/", controller.createVariableItem);
router.get("/", controller.getVariableItems);
router.get("/employee/:employeeId", controller.getVariableItemsByEmployee);
router.get("/:id", controller.getVariableItem);
router.put("/:id", controller.updateVariableItem);
router.delete("/:id", controller.deleteVariableItem);

export default router;