export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]> | undefined;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }

  static badRequest(message: string, errors?: Record<string, string[]>): AppError {
    return new AppError(message, 400, true, errors);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, 500, false);
  }
}
