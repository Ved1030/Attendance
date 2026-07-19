import type { ApiResponse } from "@/types";

export interface AttendanceRecord {
  id: string;
  subject_id: string;
  attendance_date: string;
  status: string;
  remarks: string | null;
  lecture_number: number;
  subject: {
    id: string;
    subject_name: string;
    subject_code: string;
    faculty?: { id: string; full_name: string } | null;
  };
}

export interface TodayLecture {
  id: string;
  subject: {
    id: string;
    subject_name: string;
    subject_code: string;
    faculty?: { id: string; full_name: string } | null;
  };
  startTime: string;
  endTime: string;
  room: string | null;
  dayName: string;
  status: "present" | "absent" | "cancelled" | "holiday" | "extra" | null;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "cancelled"
  | "holiday"
  | "extra";

export async function markAttendance(
  subjectId: string,
  date: string,
  status: AttendanceStatus,
  remark?: string,
): Promise<ApiResponse<AttendanceRecord>> {
  try {
    const response = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, date, status, remark }),
    });
    return await response.json();
  } catch {
    return { success: false, message: "Failed to mark attendance" };
  }
}

export async function getTodaySchedule(): Promise<ApiResponse<TodayLecture[]>> {
  try {
    const response = await fetch("/api/dashboard/today");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch today's schedule" };
  }
}

export async function getAttendanceForDate(
  date: string,
): Promise<ApiResponse<AttendanceRecord[]>> {
  try {
    const response = await fetch(
      `/api/attendance/date?date=${encodeURIComponent(date)}`,
    );
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch attendance" };
  }
}

const attendanceApi = {
  markAttendance,
  getTodaySchedule,
  getAttendanceForDate,
};

export default attendanceApi;
