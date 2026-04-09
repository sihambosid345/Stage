import express from "express";
import * as controller from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", controller.createAttendance);
router.get("/", controller.getAttendances);
router.get("/employee/:employeeId", controller.getAttendanceByEmployee);
router.get("/:id", controller.getAttendance);
router.put("/:id", controller.updateAttendance);
router.delete("/:id", controller.deleteAttendance);

export default router;