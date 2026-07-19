import type { Response, NextFunction } from "express";

import { DashboardService } from "../services/dashboard.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const dashboardService = new DashboardService();

export class DashboardController {
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const data = await dashboardService.getDashboardData(req.user.id);
      ApiResponseUtil.success(res, data, "Dashboard data fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getTodayTimetable(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const data = await dashboardService.getTodayTimetable(req.user.id);
      ApiResponseUtil.success(res, data, "Today's timetable fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getSubjectAttendance(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const data = await dashboardService.getSubjectAttendance(req.user.id);
      ApiResponseUtil.success(res, data, "Subject attendance fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getUpcomingEvents(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const data = await dashboardService.getSubjectAttendance(req.user.id);
      ApiResponseUtil.success(res, data, "Upcoming events fetched");
    } catch (error) {
      next(error);
    }
  }

  static async getAttendanceInsights(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const data = await dashboardService.getAttendanceInsights(req.user.id);
      ApiResponseUtil.success(
        res,
        data,
        "Attendance insights fetched",
      );
    } catch (error) {
      next(error);
    }
  }
}
