import type { Response, NextFunction } from "express";

import { uploadProcessingService } from "../services/upload-processing.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import type { AuthenticatedRequest } from "../types/auth.js";
import type { DocumentType } from "../ai/types.js";

const VALID_FILE_TYPES: DocumentType[] = ["TIMETABLE", "ACADEMIC_CALENDAR"];

export class UploadController {
  static async startProcessing(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const { fileId, fileType, storagePath } = req.body as Record<string, unknown>;

      if (!fileId || typeof fileId !== "string") {
        ApiResponseUtil.badRequest(res, "fileId is required");
        return;
      }

      if (!fileType || typeof fileType !== "string" || !VALID_FILE_TYPES.includes(fileType as DocumentType)) {
        ApiResponseUtil.badRequest(res, "fileType must be TIMETABLE or ACADEMIC_CALENDAR");
        return;
      }

      if (!storagePath || typeof storagePath !== "string") {
        ApiResponseUtil.badRequest(res, "storagePath is required");
        return;
      }

      const jobId = await uploadProcessingService.startProcessing(
        req.user.id,
        fileId,
        fileType as DocumentType,
        storagePath,
      );

      ApiResponseUtil.created(res, { jobId }, "Processing started");
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const { id } = req.params as { id: string };

      if (!id) {
        ApiResponseUtil.badRequest(res, "Job ID is required");
        return;
      }

      const job = uploadProcessingService.getJobStatus(id);

      if (!job) {
        ApiResponseUtil.notFound(res, "Processing job not found");
        return;
      }

      if (job.userId !== req.user.id) {
        ApiResponseUtil.forbidden(res, "Access denied");
        return;
      }

      ApiResponseUtil.success(res, {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        error: job.error,
        fileType: job.fileType,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllStatuses(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const jobs = uploadProcessingService.getUserJobs(req.user.id);

      const statuses = jobs.map((job) => ({
        id: job.id,
        fileId: job.fileId,
        fileType: job.fileType,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }));

      ApiResponseUtil.success(res, statuses);
    } catch (error) {
      next(error);
    }
  }
}
