import { Router } from "express";

import { SetupController } from "../controllers/setup.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/status", authenticate, SetupController.getSetupStatus);
router.get("/timetable", authenticate, SetupController.getTimetable);
router.post("/timetable", authenticate, SetupController.saveTimetable);

export default router;
