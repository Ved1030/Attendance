import { Router } from "express";

import { UploadController } from "../controllers/upload.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/process", authenticate, UploadController.startProcessing);
router.get("/status/:id", authenticate, UploadController.getStatus);
router.get("/statuses", authenticate, UploadController.getAllStatuses);

export default router;
