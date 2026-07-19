import { supabaseAdmin } from "../config/supabase.js";

export interface AttendanceEntry {
  subjectId: string;
  date: string;
  status: string;
  lectureNumber?: number;
  remark?: string;
}

export class AttendanceRepository {
  async markAttendance(userId: string, entry: AttendanceEntry) {
    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id, subject:subjects(id, subject_name, subject_code)")
      .eq("user_id", userId)
      .eq("subject_id", entry.subjectId)
      .eq("attendance_date", entry.date)
      .single();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("attendance")
        .update({ status: entry.status, remarks: entry.remark ?? null })
        .eq("id", (existing as { id: string }).id)
        .select("id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from("attendance")
      .insert({
        user_id: userId,
        subject_id: entry.subjectId,
        attendance_date: entry.date,
        status: entry.status,
        lecture_number: entry.lectureNumber ?? 1,
        remarks: entry.remark ?? null,
      })
      .select("id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async bulkMarkAttendance(userId: string, entries: AttendanceEntry[]) {
    const results = [];

    for (const entry of entries) {
      const { data: existing } = await supabaseAdmin
        .from("attendance")
        .select("id")
        .eq("user_id", userId)
        .eq("subject_id", entry.subjectId)
        .eq("attendance_date", entry.date)
        .single();

      let record;
      if (existing) {
        const { data, error } = await supabaseAdmin
          .from("attendance")
          .update({ status: entry.status, remarks: entry.remark ?? null })
          .eq("id", (existing as { id: string }).id)
          .select("id, subject_id, attendance_date, status, remarks, lecture_number")
          .single();

        if (error) throw new Error(error.message);
        record = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("attendance")
          .insert({
            user_id: userId,
            subject_id: entry.subjectId,
            attendance_date: entry.date,
            status: entry.status,
            lecture_number: entry.lectureNumber ?? 1,
            remarks: entry.remark ?? null,
          })
          .select("id, subject_id, attendance_date, status, remarks, lecture_number")
          .single();

        if (error) throw new Error(error.message);
        record = data;
      }

      results.push(record);
    }

    return results;
  }

  async getAttendanceForDate(userId: string, date: string) {
    const { data, error } = await supabaseAdmin
      .from("attendance")
      .select(
        "id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
      )
      .eq("user_id", userId)
      .eq("attendance_date", date);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getAttendanceForSubject(userId: string, subjectId: string) {
    const { data, error } = await supabaseAdmin
      .from("attendance")
      .select("id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .order("attendance_date", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getAttendanceHistory(userId: string, page: number, limit: number) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const [recordsResult, countResult] = await Promise.all([
      supabaseAdmin
        .from("attendance")
        .select("id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)")
        .eq("user_id", userId)
        .order("attendance_date", { ascending: false })
        .range(from, to),
      supabaseAdmin
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (recordsResult.error) throw new Error(recordsResult.error.message);

    return {
      records: recordsResult.data ?? [],
      pagination: {
        page,
        limit,
        total: countResult.count ?? 0,
        totalPages: Math.ceil((countResult.count ?? 0) / limit),
      },
    };
  }
}
