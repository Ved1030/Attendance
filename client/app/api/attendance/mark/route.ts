import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAttendance as markAttendanceDb, userHasSubject } from "@/lib/database";
import { z } from "zod";

const markAttendanceSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["present", "absent", "cancelled", "holiday", "extra"]),
  remark: z.string().max(255).optional(),
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
    const parsed = markAttendanceSchema.safeParse(body);

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

    const hasSubject = await userHasSubject(user.id, parsed.data.subjectId);
    if (!hasSubject) {
      return NextResponse.json(
        { success: false, message: "Subject not found in your timetable" },
        { status: 400 },
      );
    }

    const result = await markAttendanceDb(user.id, parsed.data);

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in POST /api/attendance/mark:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
