import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, updateProfile, validateForeignKeys } from "@/lib/database";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

const onboardingSchema = z.object({
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

export async function POST(request: Request) {
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
    const parsed = onboardingSchema.safeParse(body);

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

    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 },
      );
    }

    const fkErrors = await validateForeignKeys({
      collegeId: parsed.data.collegeId,
      departmentId: parsed.data.departmentId,
      semesterId: parsed.data.semesterId,
      divisionId: parsed.data.divisionId,
    });

    if (fkErrors) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: fkErrors,
        },
        { status: 400 },
      );
    }

    const updatedProfile = await updateProfile(user.id, {
      college_id: parsed.data.collegeId,
      department_id: parsed.data.departmentId,
      semester_id: parsed.data.semesterId,
      division_id: parsed.data.divisionId,
      target_attendance: parsed.data.targetAttendance,
      theme: parsed.data.theme,
      onboarding_completed: true,
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        id: updatedProfile.id,
        email: user.email,
        fullName: updatedProfile.full_name,
        avatarUrl: updatedProfile.avatar_url,
        college: updatedProfile.college,
        department: updatedProfile.department,
        division: updatedProfile.division,
        semester: updatedProfile.semester,
        targetAttendance: updatedProfile.target_attendance,
        theme: updatedProfile.theme,
        onboardingCompleted: updatedProfile.onboarding_completed,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/profile/onboarding:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
