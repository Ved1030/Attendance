import type { ApiResponse } from "@/types";

export interface DashboardData {
  overallPercentage: number;
  targetPercentage: number;
  totalPresent: number;
  totalLectures: number;
  totalAbsent: number;
  canMiss: number;
  neededLectures: number;
  profile: {
    college: string | null;
    department: string | null;
    division: string | null;
    semester: number | null;
  };
  subjects: SubjectAttendance[];
  todayTimetable: TodayTimetableEntry[];
}

export interface SubjectAttendance {
  id: string;
  name: string;
  code: string;
  faculty: string | null;
  total: number;
  present: number;
  absent: number;
  cancelled: number;
  percentage: number;
}

export interface TodayTimetableEntry {
  id: string;
  subject: {
    id: string;
    name: string;
    code: string;
    faculty?: { id: string; name: string } | null;
  };
  startTime: string;
  endTime: string;
  room: string | null;
  dayName: string;
  status: "present" | "absent" | "cancelled" | "holiday" | "extra" | null;
}

export interface AttendanceInsights {
  riskSubjects: SubjectAttendance[];
  weeklyTrend: {
    week: string;
    percentage: number;
    present: number;
    total: number;
  }[];
  subjectCount: number;
}

export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
  try {
    const response = await fetch("/api/dashboard");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch dashboard data" };
  }
}

export async function getInsights(): Promise<ApiResponse<AttendanceInsights>> {
  try {
    const response = await fetch("/api/dashboard/insights");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch insights" };
  }
}

const dashboardApi = { getDashboard, getInsights };
export default dashboardApi;
