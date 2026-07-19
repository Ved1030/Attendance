import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceForDate } from "@/lib/database";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, message: "Date query parameter is required" },
        { status: 400 },
      );
    }

    const result = await getAttendanceForDate(user.id, date);

    return NextResponse.json({
      success: true,
      message: "Attendance fetched",
      data: result,
    });
  } catch (error) {
    console.error("Error in GET /api/attendance/date:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
