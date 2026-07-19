import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceForSubject, userHasSubject } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { subjectId } = await params;

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

    const hasSubject = await userHasSubject(user.id, subjectId);
    if (!hasSubject) {
      return NextResponse.json(
        { success: false, message: "Subject not found" },
        { status: 404 },
      );
    }

    const result = await getAttendanceForSubject(user.id, subjectId);

    return NextResponse.json({
      success: true,
      message: "Attendance fetched",
      data: result,
    });
  } catch (error) {
    console.error("Error in GET /api/attendance/subject/[subjectId]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
