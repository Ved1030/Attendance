import { NextResponse } from "next/server";
import { getSemesters } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  try {
    const { departmentId } = await params;
    const semesters = await getSemesters(departmentId);

    return NextResponse.json({
      success: true,
      message: "Semesters fetched",
      data: semesters,
    });
  } catch (error) {
    console.error("Error in GET /api/departments/[departmentId]/semesters:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
