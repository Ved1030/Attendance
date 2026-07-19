import { NextResponse } from "next/server";
import { getDivisions } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ semesterId: string }> },
) {
  try {
    const { semesterId } = await params;
    const divisions = await getDivisions(semesterId);

    return NextResponse.json({
      success: true,
      message: "Divisions fetched",
      data: divisions,
    });
  } catch (error) {
    console.error("Error in GET /api/semesters/[semesterId]/divisions:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
