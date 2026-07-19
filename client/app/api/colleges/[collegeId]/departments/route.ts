import { NextResponse } from "next/server";
import { getDepartments } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ collegeId: string }> },
) {
  try {
    const { collegeId } = await params;
    const departments = await getDepartments(collegeId);

    return NextResponse.json({
      success: true,
      message: "Departments fetched",
      data: departments,
    });
  } catch (error) {
    console.error("Error in GET /api/colleges/[collegeId]/departments:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
