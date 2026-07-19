import { Router } from "express";

import attendanceRoutes from "./attendance.routes.js";
import authRoutes from "./auth.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import healthRoutes from "./health.routes.js";
import profileRoutes from "./profile.routes.js";
import setupRoutes from "./setup.routes.js";
import uploadRoutes from "./upload.routes.js";
import { rateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.use(rateLimiter);
router.use(healthRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/profile", profileRoutes);
router.use("/setup", setupRoutes);
router.use("/uploads", uploadRoutes);

export default router;
