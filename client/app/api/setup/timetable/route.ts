import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveTimetable as saveTimetableDb, getTimetable, getProfile } from "@/lib/database";
import { z } from "zod";

const saveTimetableSchema = z.object({
  subjects: z
    .array(
      z.object({
        name: z.string().min(1, "Subject name is required").max(255),
        code: z.string().min(1, "Subject code is required").max(20),
        facultyName: z.string().max(255).optional(),
      }),
    )
    .min(1, "At least one subject is required"),
  timetable: z
    .array(
      z.object({
        subjectIndex: z.number().int().min(0, "Invalid subject reference"),
        dayOfWeek: z.number().int().min(0).max(6, "Day must be 0-6 (Sun-Sat)"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
        room: z.string().max(50).optional(),
      }),
    )
    .min(1, "At least one timetable entry is required"),
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

    const timetable = await getTimetable(user.id);

    return NextResponse.json({
      success: true,
      message: "Timetable fetched",
      data: timetable,
    });
  } catch (error) {
    console.error("Error in GET /api/setup/timetable:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

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
    const parsed = saveTimetableSchema.safeParse(body);

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

    if (!profile.semester_id || !profile.division_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete the onboarding first (select semester and division)",
        },
        { status: 400 },
      );
    }

    const result = await saveTimetableDb(
      user.id,
      profile.semester_id,
      profile.division_id,
      parsed.data.subjects,
      parsed.data.timetable,
    );

    return NextResponse.json({
      success: true,
      message: "Timetable saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in POST /api/setup/timetable:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
