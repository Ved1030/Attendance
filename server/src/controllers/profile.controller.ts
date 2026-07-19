import type { Response, NextFunction } from "express";

import { ProfileService } from "../services/profile.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import {
  updateProfileSchema,
  onboardingSchema,
} from "../validators/profile.validator.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const profileService = new ProfileService();

export class ProfileController {
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const profile = await profileService.getProfile(req.user.id);

      ApiResponseUtil.success(
        res,
        {
          id: profile.id,
          email: req.user.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          college: profile.college,
          department: profile.department,
          division: profile.division,
          semester: profile.semester,
          targetAttendance: profile.target_attendance,
          theme: profile.theme,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        "Profile fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const parsed = updateProfileSchema.safeParse(req.body);

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

      const profile = await profileService.updateProfile(
        req.user.id,
        parsed.data,
      );

      ApiResponseUtil.success(
        res,
        {
          id: profile.id,
          email: req.user.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          college: profile.college,
          department: profile.department,
          division: profile.division,
          semester: profile.semester,
          targetAttendance: profile.target_attendance,
          theme: profile.theme,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        "Profile updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async completeOnboarding(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const parsed = onboardingSchema.safeParse(req.body);

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

      const profile = await profileService.completeOnboarding(
        req.user.id,
        parsed.data,
      );

      ApiResponseUtil.success(
        res,
        {
          id: profile.id,
          email: req.user.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          college: profile.college,
          department: profile.department,
          division: profile.division,
          semester: profile.semester,
          targetAttendance: profile.target_attendance,
          theme: profile.theme,
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        "Onboarding completed successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}
