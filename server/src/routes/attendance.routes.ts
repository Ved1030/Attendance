import { Router } from "express";

import { AttendanceController } from "../controllers/attendance.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/mark", authenticate, AttendanceController.markAttendance);
router.post("/bulk", authenticate, AttendanceController.bulkMarkAttendance);
router.get("/date", authenticate, AttendanceController.getForDate);
router.get("/subject/:subjectId", authenticate, AttendanceController.getForSubject);
router.get("/history", authenticate, AttendanceController.getHistory);

export default router;
