import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/database";

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

    const profile = await ensureProfile(user.id);

    return NextResponse.json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile: {
          id: profile.id,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          onboardingCompleted: profile.onboarding_completed,
        },
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
