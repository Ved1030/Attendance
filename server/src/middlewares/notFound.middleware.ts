import type { Request, Response } from "express";

import { ApiResponseUtil } from "../utils/apiResponse.js";

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponseUtil.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
};
