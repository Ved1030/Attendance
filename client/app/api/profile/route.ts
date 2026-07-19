import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, updateProfile } from "@/lib/database";
import { z } from "zod";

const updateProfileSchema = z.object({
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

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const profile = await getProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        id: profile.id,
        email: user.email,
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
    });
  } catch (error) {
    console.error("Error in GET /api/profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: fieldErrors,
        },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) updateData.full_name = parsed.data.fullName;
    if (parsed.data.avatarUrl !== undefined) updateData.avatar_url = parsed.data.avatarUrl;
    if (parsed.data.targetAttendance !== undefined) updateData.target_attendance = parsed.data.targetAttendance;
    if (parsed.data.theme !== undefined) updateData.theme = parsed.data.theme;

    const profile = await updateProfile(user.id, updateData);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: profile.id,
        email: user.email,
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
    });
  } catch (error) {
    console.error("Error in PATCH /api/profile:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
