import type { Response, NextFunction } from "express";

import { SetupService } from "../services/setup.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import { saveTimetableSchema } from "../validators/setup.validator.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const setupService = new SetupService();

export class SetupController {
  static async getSetupStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const status = await setupService.getSetupStatus(req.user.id);
      ApiResponseUtil.success(res, status, "Setup status fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getTimetable(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const timetable = await setupService.getTimetable(req.user.id);
      ApiResponseUtil.success(res, timetable, "Timetable fetched");
    } catch (error) {
      next(error);
    }
  }

  static async saveTimetable(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const parsed = saveTimetableSchema.safeParse(req.body);

      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(issue.message);
        }
        ApiResponseUtil.badRequest(res, "Validation failed", fieldErrors);
        return;
      }

      const result = await setupService.saveTimetable(
        req.user.id,
        parsed.data,
      );
      ApiResponseUtil.success(
        res,
        result,
        "Timetable saved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}
