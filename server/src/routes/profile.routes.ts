import { Router } from "express";

import { ProfileController } from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, ProfileController.getProfile);
router.patch("/", authenticate, ProfileController.updateProfile);
router.post("/onboarding", authenticate, ProfileController.completeOnboarding);

export default router;
