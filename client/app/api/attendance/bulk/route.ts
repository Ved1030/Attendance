import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkMarkAttendance as bulkMarkAttendanceDb, userHasSubject } from "@/lib/database";
import { z } from "zod";

const bulkMarkAttendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["present", "absent", "cancelled", "holiday", "extra"]),
        remark: z.string().max(255).optional(),
      }),
    )
    .min(1, "At least one entry is required"),
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
    const parsed = bulkMarkAttendanceSchema.safeParse(body);

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

    for (const entry of parsed.data.entries) {
      const hasSubject = await userHasSubject(user.id, entry.subjectId);
      if (!hasSubject) {
        return NextResponse.json(
          {
            success: false,
            message: `Subject ${entry.subjectId} not found in your timetable`,
          },
          { status: 400 },
        );
      }
    }

    const result = await bulkMarkAttendanceDb(user.id, parsed.data.entries);

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in POST /api/attendance/bulk:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
