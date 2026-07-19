import type { Response, NextFunction } from "express";

import { AttendanceService } from "../services/attendance.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
} from "../validators/attendance.validator.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const attendanceService = new AttendanceService();

export class AttendanceController {
  static async markAttendance(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const parsed = markAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = [];
          fieldErrors[path].push(issue.message);
        }
        ApiResponseUtil.badRequest(res, "Validation failed", fieldErrors);
        return;
      }

      const result = await attendanceService.markAttendance(
        req.user.id,
        parsed.data,
      );
      ApiResponseUtil.success(
        res,
        result,
        "Attendance marked successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async bulkMarkAttendance(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const parsed = bulkMarkAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = [];
          fieldErrors[path].push(issue.message);
        }
        ApiResponseUtil.badRequest(res, "Validation failed", fieldErrors);
        return;
      }

      const result = await attendanceService.bulkMarkAttendance(
        req.user.id,
        parsed.data,
      );
      ApiResponseUtil.success(
        res,
        result,
        "Attendance marked successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getForDate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const date = req.query.date as string;
      if (!date) {
        ApiResponseUtil.badRequest(
          res,
          "Date query parameter is required",
        );
        return;
      }

      const result = await attendanceService.getAttendanceForDate(
        req.user.id,
        date,
      );
      ApiResponseUtil.success(res, result, "Attendance fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getForSubject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const subjectId = req.params.subjectId as string;
      const result = await attendanceService.getAttendanceForSubject(
        req.user.id,
        subjectId,
      );
      ApiResponseUtil.success(res, result, "Attendance fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await attendanceService.getAttendanceHistory(
        req.user.id,
        page,
        Math.min(limit, 100),
      );
      ApiResponseUtil.success(
        res,
        result,
        "Attendance history fetched",
      );
    } catch (error) {
      next(error);
    }
  }
}
