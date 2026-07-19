import { AttendanceRepository } from "../repositories/attendance.repository.js";
import { AppError } from "../types/index.js";
import { supabaseAdmin } from "../config/supabase.js";
import type {
  MarkAttendanceInput,
  BulkMarkAttendanceInput,
} from "../validators/attendance.validator.js";

const attendanceRepository = new AttendanceRepository();

export class AttendanceService {
  async markAttendance(userId: string, data: MarkAttendanceInput) {
    const hasSubject = await this.userHasSubject(userId, data.subjectId);
    if (!hasSubject) {
      throw AppError.badRequest("Subject not found in your timetable");
    }

    return attendanceRepository.markAttendance(userId, {
      subjectId: data.subjectId,
      date: data.date,
      status: data.status,
      ...(data.remark ? { remark: data.remark } : {}),
    });
  }

  async bulkMarkAttendance(userId: string, data: BulkMarkAttendanceInput) {
    for (const entry of data.entries) {
      const hasSubject = await this.userHasSubject(userId, entry.subjectId);
      if (!hasSubject) {
        throw AppError.badRequest(
          `Subject ${entry.subjectId} not found in your timetable`,
        );
      }
    }

    const entries = data.entries.map((entry) => ({
      subjectId: entry.subjectId,
      date: entry.date,
      status: entry.status,
      ...(entry.remark ? { remark: entry.remark } : {}),
    }));
    return attendanceRepository.bulkMarkAttendance(userId, entries);
  }

  async getAttendanceForDate(userId: string, date: string) {
    return attendanceRepository.getAttendanceForDate(userId, date);
  }

  async getAttendanceForSubject(userId: string, subjectId: string) {
    const hasSubject = await this.userHasSubject(userId, subjectId);
    if (!hasSubject) {
      throw AppError.notFound("Subject not found");
    }

    return attendanceRepository.getAttendanceForSubject(userId, subjectId);
  }

  async getAttendanceHistory(userId: string, page: number, limit: number) {
    return attendanceRepository.getAttendanceHistory(userId, page, limit);
  }

  private async userHasSubject(
    userId: string,
    subjectId: string,
  ): Promise<boolean> {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("division_id")
      .eq("id", userId)
      .single();

    const p = profile as { division_id: string | null } | null;
    if (!p?.division_id) return false;

    const { count } = await supabaseAdmin
      .from("timetables")
      .select("id", { count: "exact", head: true })
      .eq("division_id", p.division_id)
      .eq("subject_id", subjectId);

    return (count ?? 0) > 0;
  }
}
