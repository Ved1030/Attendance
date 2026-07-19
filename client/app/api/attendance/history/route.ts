import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceHistory } from "@/lib/database";

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
    const page = parseInt(searchParams.get("page") ?? "1") || 1;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20") || 20,
      100,
    );

    const result = await getAttendanceHistory(user.id, page, limit);

    return NextResponse.json({
      success: true,
      message: "Attendance history fetched",
      data: result,
    });
  } catch (error) {
    console.error("Error in GET /api/attendance/history:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
