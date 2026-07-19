import { NextResponse } from "next/server";
import { getColleges } from "@/lib/database";

export async function GET() {
  try {
    const colleges = await getColleges();

    return NextResponse.json({
      success: true,
      message: "Colleges fetched",
      data: colleges,
    });
  } catch (error) {
    console.error("Error in GET /api/colleges:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
