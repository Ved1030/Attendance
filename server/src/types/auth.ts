import type { Request } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
  supabase?: SupabaseClient;
}
