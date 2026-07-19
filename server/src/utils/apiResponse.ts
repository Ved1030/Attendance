import type { Response } from "express";

import type { ApiResponse } from "../types/index.js";

export class ApiResponseUtil {
  static success<T>(res: Response, data: T, message = "Success", statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message = "Created successfully"): Response {
    return ApiResponseUtil.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static error(
    res: Response,
    message = "Internal server error",
    statusCode = 500,
    errors?: Record<string, string[]>,
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(errors !== undefined && { errors }),
    };
    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, message = "Bad request", errors?: Record<string, string[]>): Response {
    return ApiResponseUtil.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message = "Unauthorized"): Response {
    return ApiResponseUtil.error(res, message, 401);
  }

  static forbidden(res: Response, message = "Forbidden"): Response {
    return ApiResponseUtil.error(res, message, 403);
  }

  static notFound(res: Response, message = "Not found"): Response {
    return ApiResponseUtil.error(res, message, 404);
  }

  static conflict(res: Response, message = "Conflict"): Response {
    return ApiResponseUtil.error(res, message, 409);
  }

  static tooManyRequests(res: Response, message = "Too many requests"): Response {
    return ApiResponseUtil.error(res, message, 429);
  }
}
