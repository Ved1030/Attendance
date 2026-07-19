import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceInsights } from "@/lib/database";

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

    const data = await getAttendanceInsights(user.id);

    return NextResponse.json({
      success: true,
      message: "Attendance insights fetched",
      data,
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/insights:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
