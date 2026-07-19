import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name cannot be empty")
    .max(255, "Full name must be 255 characters or less")
    .optional(),
  avatarUrl: z
    .string()
    .url("Invalid URL format")
    .max(500, "Avatar URL must be 500 characters or less")
    .optional()
    .nullable(),
  targetAttendance: z
    .number()
    .int("Target attendance must be a whole number")
    .min(0, "Target attendance must be at least 0")
    .max(100, "Target attendance must be at most 100")
    .optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
});

export const onboardingSchema = z.object({
  collegeId: uuidSchema,
  departmentId: uuidSchema,
  semesterId: uuidSchema,
  divisionId: uuidSchema,
  targetAttendance: z
    .number()
    .int("Target attendance must be a whole number")
    .min(0, "Target attendance must be at least 0")
    .max(100, "Target attendance must be at most 100")
    .default(75),
  theme: z.enum(["system", "light", "dark"]).default("system"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
