import { Router } from "express";
import type { Request, Response } from "express";

import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env["NODE_ENV"],
    },
  });
});

router.get("/health/database", async (_req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      res.status(503).json({
        success: false,
        message: "Database connection failed",
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Database connection is healthy",
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Database connection failed",
      data: {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

router.get("/health/auth", async (_req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      res.status(503).json({
        success: false,
        message: "Supabase Auth connection failed",
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Supabase Auth connection is healthy",
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Supabase Auth connection failed",
      data: {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
