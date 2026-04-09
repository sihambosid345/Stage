import express from "express";
import * as controller from "../controllers/employeeContractController.js";

const router = express.Router();

router.post("/", controller.createContract);
router.get("/", controller.getContracts);
router.get("/employee/:employeeId", controller.getContractsByEmployee);
router.get("/:id", controller.getContract);
router.put("/:id", controller.updateContract);
router.delete("/:id", controller.deleteContract);

export default router;