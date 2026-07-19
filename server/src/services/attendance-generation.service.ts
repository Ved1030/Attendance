import { supabaseAdmin } from "../config/supabase.js";

export interface GenerationResult {
  success: boolean;
  sessionsCreated: number;
  sessionsSkipped: number;
  holidaysSkipped: number;
}

export class AttendanceGenerationService {
  async generateSessions(
    userId: string,
    divisionId: string,
    semesterStart: string,
    semesterEnd: string,
  ): Promise<GenerationResult> {
    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);

    console.log("[Attendance] Starting session generation...");
    console.log(`[Attendance] Semester Start: ${semesterStart}`);
    console.log(`[Attendance] Semester End: ${semesterEnd}`);

    const holidayRows = await this.getHolidayDates(userId, semesterStart, semesterEnd);
    const holidayDates = holidayRows
      .filter((h) => h.type === "HOLIDAY" || h.type === "FESTIVAL" || h.type === "VACATION")
      .map((h) => h.date);
    const examDates = holidayRows
      .filter((h) => h.type === "EXAM" || h.type === "MID_SEMESTER" || h.type === "END_SEMESTER")
      .map((h) => h.date);

    const totalDays = this.countWeekdays(start, end, holidayDates, examDates);
    console.log(`[Attendance] Working Days (approx): ${totalDays}`);

    const { data, error } = await supabaseAdmin.rpc("generate_sessions", {
      p_division_id: divisionId,
      p_semester_start: semesterStart,
      p_semester_end: semesterEnd,
      p_holiday_dates: holidayDates.length > 0 ? holidayDates : null,
      p_exam_dates: examDates.length > 0 ? examDates : null,
      p_break_dates: null,
      p_user_id: userId,
    });

    if (error) {
      console.error("[Attendance] Generation failed:", error.message);
      throw new Error(`Failed to generate attendance sessions: ${error.message}`);
    }

    const result = data as GenerationResult;

    console.log(`[Attendance] Sessions Generated: ${result.sessionsCreated}`);
    console.log(`[Attendance] Sessions Skipped: ${result.sessionsSkipped}`);
    console.log(`[Attendance] Holidays: ${result.holidaysSkipped}`);
    console.log("[Attendance] Generation complete.");

    return result;
  }

  async getGeneratedSessions(
    divisionId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    let query = supabaseAdmin
      .from("attendance_sessions")
      .select(
        "id, date, day_of_week, start_time, end_time, room, lecture_type, lecture_number, status, subject:subject_id(id, subject_name, subject_code), faculty:faculty_id(id, full_name)",
      )
      .eq("division_id", divisionId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getUpcomingSessions(divisionId: string, limit = 10) {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("attendance_sessions")
      .select(
        "id, date, day_of_week, start_time, end_time, room, lecture_type, lecture_number, status, subject:subject_id(id, subject_name, subject_code), faculty:faculty_id(id, full_name)",
      )
      .eq("division_id", divisionId)
      .gte("date", today)
      .eq("status", "scheduled")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getGenerationLogs(divisionId: string) {
    const { data, error } = await supabaseAdmin
      .from("session_generation_log")
      .select("*")
      .eq("division_id", divisionId)
      .order("generated_at", { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async getHolidayDates(
    userId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Array<{ date: string; type: string }>> {
    const { data, error } = await supabaseAdmin
      .from("holidays")
      .select("date, type")
      .eq("user_id", userId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    if (error) {
      console.warn("[Attendance] Failed to fetch holidays:", error.message);
      return [];
    }

    return (data ?? []).map((h: Record<string, unknown>) => ({
      date: h.date as string,
      type: h.type as string,
    }));
  }

  private countWeekdays(
    start: Date,
    end: Date,
    holidayDates: string[],
    examDates: string[],
  ): number {
    const holidaySet = new Set(holidayDates);
    const examSet = new Set(examDates);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dow = current.getDay();
      const dateStr = current.toISOString().split("T")[0];
      if (dow !== 0 && !holidaySet.has(dateStr!) && !examSet.has(dateStr!)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}
