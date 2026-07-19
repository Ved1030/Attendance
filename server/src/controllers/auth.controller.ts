import type { Response, NextFunction } from "express";

import { AuthService } from "../services/auth.service.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export class AuthController {
  static async me(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseUtil.unauthorized(res, "Authentication required");
        return;
      }

      const profile = await AuthService.ensureProfile(req.user.id);

      ApiResponseUtil.success(
        res,
        {
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
          },
          profile: {
            id: profile.id,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            onboardingCompleted: profile.onboarding_completed,
          },
        },
        "Profile fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}
