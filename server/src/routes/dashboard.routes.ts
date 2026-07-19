import { Router } from "express";

import { DashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, DashboardController.getDashboard);
router.get("/today", authenticate, DashboardController.getTodayTimetable);
router.get("/subjects", authenticate, DashboardController.getSubjectAttendance);
router.get("/events", authenticate, DashboardController.getUpcomingEvents);
router.get("/insights", authenticate, DashboardController.getAttendanceInsights);

export default router;
