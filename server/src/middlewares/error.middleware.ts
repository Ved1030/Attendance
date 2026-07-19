import type { Request, Response, NextFunction } from "express";

import { AppError } from "../types/index.js";
import { env } from "../config/env.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors !== undefined && { errors: err.errors }),
    });
    return;
  }

  if (env.NODE_ENV === "development") {
    console.error("Unhandled error:", err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
