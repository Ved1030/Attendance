import { Router } from "express";

import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, AuthController.me);

export default router;
