import type { Response, NextFunction } from "express";

import { supabaseAdmin, createUserClient } from "../config/supabase.js";
import { ApiResponseUtil } from "../utils/apiResponse.js";
import type { AuthenticatedRequest } from "../types/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        appMetadata: Record<string, unknown>;
        userMetadata: Record<string, unknown>;
      };
      token?: string;
    }
  }
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ApiResponseUtil.unauthorized(res, "Missing or invalid authorization header");
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      ApiResponseUtil.unauthorized(res, "Missing access token");
      return;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      ApiResponseUtil.unauthorized(res, "Invalid or expired token");
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? "",
      role: data.user.role ?? "authenticated",
      appMetadata: data.user.app_metadata,
      userMetadata: data.user.user_metadata,
    };

    req.token = token;
    req.supabase = createUserClient(token);

    next();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Auth middleware error:", error.message);
    }
    ApiResponseUtil.unauthorized(res, "Authentication failed");
  }
};
