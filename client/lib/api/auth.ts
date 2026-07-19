import { createClient } from "@/lib/supabase/client";
import type {
  ApiResponse,
  OnboardingData,
  College,
  Department,
  Semester,
  Division,
} from "@/types";

export async function getProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function completeOnboarding(
  data: OnboardingData,
): Promise<ApiResponse> {
  try {
    const response = await fetch("/api/profile/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch {
    return { success: false, message: "Failed to complete onboarding" };
  }
}

export async function getColleges(): Promise<ApiResponse<College[]>> {
  try {
    const response = await fetch("/api/colleges");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch colleges" };
  }
}

export async function getDepartments(
  collegeId: string,
): Promise<ApiResponse<Department[]>> {
  try {
    const response = await fetch(
      `/api/colleges/${collegeId}/departments`,
    );
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch departments" };
  }
}

export async function getSemesters(
  departmentId: string,
): Promise<ApiResponse<Semester[]>> {
  try {
    const response = await fetch(
      `/api/departments/${departmentId}/semesters`,
    );
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch semesters" };
  }
}

export async function getDivisions(
  semesterId: string,
): Promise<ApiResponse<Division[]>> {
  try {
    const response = await fetch(
      `/api/semesters/${semesterId}/divisions`,
    );
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch divisions" };
  }
}

const api = {
  getProfile,
  completeOnboarding,
  getColleges,
  getDepartments,
  getSemesters,
  getDivisions,
};

export default api;
