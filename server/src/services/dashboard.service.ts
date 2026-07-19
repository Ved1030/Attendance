import { supabaseAdmin } from "../config/supabase.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class DashboardService {
  async getDashboardData(userId: string) {
    const [profileResult, subjectAttendance, todayEntries] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "target_attendance, college:colleges(name), department:departments(name), division:divisions(division_name), semester:semesters(semester_number)",
        )
        .eq("id", userId)
        .single(),
      this.getSubjectAttendance(userId),
      this.getTodayTimetable(userId),
    ]);

    const profile = profileResult.data as Record<string, unknown> | null;

    const totalPresent = subjectAttendance.reduce(
      (sum, s) => sum + s.present,
      0,
    );
    const totalLectures = subjectAttendance.reduce(
      (sum, s) => sum + s.total,
      0,
    );
    const overallPercentage =
      totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;

    const targetPercentage = (profile?.target_attendance as number) ?? 75;

    const canMiss = this.calculateCanMiss(
      totalPresent,
      totalLectures,
      targetPercentage,
    );

    const neededLectures = this.calculateNeededToReachTarget(
      totalPresent,
      totalLectures,
      targetPercentage,
    );

    const collegeRel = profile?.college as Record<string, unknown> | null;
    const deptRel = profile?.department as Record<string, unknown> | null;
    const divRel = profile?.division as Record<string, unknown> | null;
    const semRel = profile?.semester as Record<string, unknown> | null;

    return {
      overallPercentage,
      targetPercentage,
      totalPresent,
      totalLectures,
      totalAbsent: totalLectures - totalPresent,
      canMiss,
      neededLectures,
      profile: {
        college: (collegeRel?.name as string) ?? null,
        department: (deptRel?.name as string) ?? null,
        division: (divRel?.division_name as string) ?? null,
        semester: (semRel?.semester_number as number) ?? null,
      },
      subjects: subjectAttendance,
      todayTimetable: todayEntries,
    };
  }

  async getTodayTimetable(userId: string) {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("division_id")
      .eq("id", userId)
      .single();

    const p = profile as { division_id: string | null } | null;
    if (!p?.division_id) return [];

    const { data: entries } = await supabaseAdmin
      .from("timetables")
      .select(
        "id, subject_id, start_time, end_time, room_number, lecture_number, lecture_type, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
      )
      .eq("division_id", p.division_id)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true });

    const todayStr = today.toISOString().split("T")[0];
    const subjectIds = (entries ?? []).map(
      (e: Record<string, unknown>) => e.subject_id as string,
    );

    let attendanceRecords: Record<string, unknown>[] = [];
    if (subjectIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("attendance")
        .select("subject_id, status")
        .eq("user_id", userId)
        .eq("attendance_date", todayStr)
        .in("subject_id", subjectIds);
      attendanceRecords = (data as Record<string, unknown>[]) ?? [];
    }

    const attendanceMap = new Map(
      attendanceRecords.map((a) => [a.subject_id as string, a.status as string]),
    );

    return (entries ?? []).map((entry: Record<string, unknown>) => {
      const startTime = String(entry.start_time ?? "");
      const endTime = String(entry.end_time ?? "");
      return {
        id: entry.id as string,
        subject: entry.subject,
        startTime: startTime.slice(0, 5),
        endTime: endTime.slice(0, 5),
        room: entry.room_number as string | null,
        dayName: DAY_NAMES[dayOfWeek],
        status: (attendanceMap.get(entry.subject_id as string) as string) ?? null,
      };
    });
  }

  async getSubjectAttendance(userId: string) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("division_id")
      .eq("id", userId)
      .single();

    const p = profile as { division_id: string | null } | null;
    if (!p?.division_id) return [];

    const { data: timetableEntries } = await supabaseAdmin
      .from("timetables")
      .select("subject_id")
      .eq("division_id", p.division_id);

    const subjectIds = [
      ...new Set(
        ((timetableEntries as Record<string, unknown>[]) ?? []).map(
          (t) => t.subject_id as string,
        ),
      ),
    ];

    if (subjectIds.length === 0) return [];

    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, subject_name, subject_code, faculty:faculty(full_name)")
      .in("id", subjectIds);

    const { data: attendanceRecords } = await supabaseAdmin
      .from("attendance")
      .select("subject_id, status")
      .eq("user_id", userId)
      .in("subject_id", subjectIds);

    return ((subjects as Record<string, unknown>[]) ?? []).map((subject) => {
      const subId = subject.id as string;
      const records = ((attendanceRecords as Record<string, unknown>[]) ?? []).filter(
        (a) => a.subject_id === subId,
      );
      const present = records.filter((a) => a.status === "present").length;
      const absent = records.filter((a) => a.status === "absent").length;
      const cancelled = records.filter((a) => a.status === "cancelled").length;
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      const facultyRel = subject.faculty as Record<string, unknown> | null;

      return {
        id: subId,
        name: subject.subject_name as string,
        code: subject.subject_code as string,
        faculty: (facultyRel?.full_name as string) ?? null,
        total,
        present,
        absent,
        cancelled,
        percentage,
      };
    });
  }

  async getAttendanceInsights(userId: string) {
    const subjects = await this.getSubjectAttendance(userId);

    const riskSubjects = subjects.filter(
      (s) => s.total > 0 && s.percentage < 75,
    );

    const weeklyTrend = [];
    for (let week = 3; week >= 0; week--) {
      const start = new Date();
      start.setDate(start.getDate() - (week * 7 + 6));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - week * 7);
      end.setHours(23, 59, 59, 999);

      const { data: weekAttendance } = await supabaseAdmin
        .from("attendance")
        .select("status")
        .eq("user_id", userId)
        .gte("attendance_date", start.toISOString().split("T")[0])
        .lte("attendance_date", end.toISOString().split("T")[0]);

      const records = (weekAttendance as Record<string, unknown>[]) ?? [];
      const present = records.filter((a) => a.status === "present").length;
      const total = records.filter(
        (a) => a.status === "present" || a.status === "absent",
      ).length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      weeklyTrend.push({
        week: `Week ${4 - week}`,
        percentage,
        present,
        total,
      });
    }

    return {
      riskSubjects,
      weeklyTrend,
      subjectCount: subjects.length,
    };
  }

  private calculateCanMiss(
    present: number,
    total: number,
    target: number,
  ): number {
    if (total === 0) return 0;

    let canMiss = 0;
    let currentPresent = present;
    let currentTotal = total;

    while (true) {
      const newPercentage = Math.round(
        (currentPresent / (currentTotal + 1)) * 100,
      );
      if (newPercentage < target) break;
      canMiss++;
      currentTotal++;
    }

    return canMiss;
  }

  private calculateNeededToReachTarget(
    present: number,
    total: number,
    target: number,
  ): number {
    if (total === 0) return 0;

    const currentPercentage = Math.round((present / total) * 100);
    if (currentPercentage >= target) return 0;

    let needed = 0;
    let currentPresent = present;
    let currentTotal = total;

    while (Math.round((currentPresent / currentTotal) * 100) < target) {
      currentPresent++;
      currentTotal++;
      needed++;
      if (needed > 1000) break;
    }

    return needed;
  }
}
