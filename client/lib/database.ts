import { createAdminClient } from "@/lib/supabase/admin";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getClient() {
  return createAdminClient();
}

export interface ProfileWithRelations {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  college_id: string | null;
  department_id: string | null;
  division_id: string | null;
  semester_id: string | null;
  target_attendance: number | null;
  theme: string | null;
  onboarding_completed: boolean | null;
  setup_completed: boolean | null;
  timetable_uploaded: boolean | null;
  calendar_uploaded: boolean | null;
  created_at: string;
  updated_at: string;
  college: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; division_name: string } | null;
  semester: { id: string; semester_number: number } | null;
}

const PROFILE_SELECT =
  "*, college:colleges(id, name), department:departments(id, name), division:divisions(id, division_name), semester:semesters(id, semester_number)";

export async function getProfile(
  userId: string,
): Promise<ProfileWithRelations | null> {
  const sb = getClient();
  const { data, error } = await sb
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as ProfileWithRelations;
}

export async function ensureProfile(
  userId: string,
): Promise<ProfileWithRelations> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const sb = getClient();
  const { data, error } = await sb
    .from("profiles")
    .insert({ id: userId })
    .select(PROFILE_SELECT)
    .single();

  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  return data as ProfileWithRelations;
}

export async function updateProfile(
  userId: string,
  updates: Record<string, unknown>,
): Promise<ProfileWithRelations> {
  const sb = getClient();
  const { data, error } = await sb
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data as ProfileWithRelations;
}

export async function getColleges() {
  const sb = getClient();
  const { data, error } = await sb
    .from("colleges")
    .select("id, name")
    .order("name");

  if (error) throw new Error(`Failed to fetch colleges: ${error.message}`);
  return data ?? [];
}

export async function getDepartments(collegeId: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from("departments")
    .select("id, name")
    .eq("college_id", collegeId)
    .order("name");

  if (error) throw new Error(`Failed to fetch departments: ${error.message}`);
  return data ?? [];
}

export async function getSemesters(departmentId: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from("semesters")
    .select("id, semester_number")
    .eq("department_id", departmentId)
    .order("semester_number");

  if (error) throw new Error(`Failed to fetch semesters: ${error.message}`);
  return data ?? [];
}

export async function getDivisions(semesterId: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from("divisions")
    .select("id, division_name")
    .eq("semester_id", semesterId)
    .order("division_name");

  if (error) throw new Error(`Failed to fetch divisions: ${error.message}`);
  return data ?? [];
}

export async function validateForeignKeys(data: {
  collegeId?: string;
  departmentId?: string;
  semesterId?: string;
  divisionId?: string;
}): Promise<Record<string, string> | null> {
  const sb = getClient();
  const errors: Record<string, string> = {};

  if (data.collegeId) {
    const { count } = await sb
      .from("colleges")
      .select("id", { count: "exact", head: true })
      .eq("id", data.collegeId);
    if (!count) errors.collegeId = "College not found";
  }
  if (data.departmentId) {
    const { count } = await sb
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("id", data.departmentId);
    if (!count) errors.departmentId = "Department not found";
  }
  if (data.semesterId) {
    const { count } = await sb
      .from("semesters")
      .select("id", { count: "exact", head: true })
      .eq("id", data.semesterId);
    if (!count) errors.semesterId = "Semester not found";
  }
  if (data.divisionId) {
    const { count } = await sb
      .from("divisions")
      .select("id", { count: "exact", head: true })
      .eq("id", data.divisionId);
    if (!count) errors.divisionId = "Division not found";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export async function userHasSubject(
  userId: string,
  subjectId: string,
): Promise<boolean> {
  const sb = getClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("division_id")
    .eq("id", userId)
    .single();

  if (!profile?.division_id) return false;

  const { count } = await sb
    .from("timetables")
    .select("id", { count: "exact", head: true })
    .eq("division_id", profile.division_id)
    .eq("subject_id", subjectId);

  return (count ?? 0) > 0;
}

export interface SubjectAttendanceRow {
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

export async function getSubjectAttendance(
  userId: string,
): Promise<SubjectAttendanceRow[]> {
  const sb = getClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("division_id")
    .eq("id", userId)
    .single();

  if (!profile?.division_id) return [];

  const { data: timetableEntries } = await sb
    .from("timetables")
    .select("subject_id")
    .eq("division_id", profile.division_id);

  const subjectIds = [
    ...new Set(timetableEntries?.map((t) => t.subject_id) ?? []),
  ];
  if (subjectIds.length === 0) return [];

  const { data: subjects } = await sb
    .from("subjects")
    .select("id, subject_name, subject_code, faculty:faculty(full_name)")
    .in("id", subjectIds);

  const { data: attendanceRecords } = await sb
    .from("attendance")
    .select("subject_id, status")
    .eq("user_id", userId)
    .in("subject_id", subjectIds);

  return (
    subjects?.map((subject) => {
      const records =
        attendanceRecords?.filter((a) => a.subject_id === subject.id) ?? [];
      const present = records.filter((a) => a.status === "present").length;
      const absent = records.filter((a) => a.status === "absent").length;
      const cancelled = records.filter((a) => a.status === "cancelled").length;
      const total = present + absent;
      const percentage =
        total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        id: subject.id,
        name: subject.subject_name,
        code: subject.subject_code,
        faculty: subject.faculty?.full_name ?? null,
        total,
        present,
        absent,
        cancelled,
        percentage,
      };
    }) ?? []
  );
}

export async function getTodayTimetable(userId: string) {
  const sb = getClient();
  const today = new Date();
  const dayOfWeek = today.getDay();

  const { data: profile } = await sb
    .from("profiles")
    .select("division_id")
    .eq("id", userId)
    .single();

  if (!profile?.division_id) return [];

  const { data: entries } = await sb
    .from("timetables")
    .select(
      "id, subject_id, start_time, end_time, room_number, lecture_number, lecture_type, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
    )
    .eq("division_id", profile.division_id)
    .eq("day_of_week", dayOfWeek)
    .order("start_time", { ascending: true });

  const todayStr = today.toISOString().split("T")[0];
  const subjectIds = entries?.map((e) => e.subject_id) ?? [];

  let attendanceMap = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data: attendanceRecords } = await sb
      .from("attendance")
      .select("subject_id, status")
      .eq("user_id", userId)
      .eq("attendance_date", todayStr)
      .in("subject_id", subjectIds);

    attendanceMap = new Map(
      attendanceRecords?.map((a) => [a.subject_id, a.status]) ?? [],
    );
  }

  return (
    entries?.map((entry) => {
      const subjectData = entry.subject as Record<string, unknown> | null;
      const facultyData = subjectData?.faculty as Record<string, unknown> | null;
      return {
        id: entry.id,
        subject: {
          id: subjectData?.id as string,
          name: subjectData?.subject_name as string,
          code: subjectData?.subject_code as string,
          faculty: facultyData ? { id: facultyData.id as string, name: facultyData.full_name as string } : null,
        },
        startTime: String(entry.start_time ?? "").slice(0, 5),
        endTime: String(entry.end_time ?? "").slice(0, 5),
        room: entry.room_number as string | null,
        dayName: DAY_NAMES[dayOfWeek],
        status: attendanceMap.get(entry.subject_id) ?? null,
      };
    }) ?? []
  );
}

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
  subjects: SubjectAttendanceRow[];
  todayTimetable: Awaited<ReturnType<typeof getTodayTimetable>>;
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const sb = getClient();

  const [profile, subjectAttendance, todayTimetable] = await Promise.all([
    sb
      .from("profiles")
      .select(
        "target_attendance, college:colleges(name), department:departments(name), division:divisions(division_name), semester:semesters(semester_number)",
      )
      .eq("id", userId)
      .single(),
    getSubjectAttendance(userId),
    getTodayTimetable(userId),
  ]);

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
  const targetPercentage = profile.data?.target_attendance ?? 75;

  return {
    overallPercentage,
    targetPercentage,
    totalPresent,
    totalLectures,
    totalAbsent: totalLectures - totalPresent,
    canMiss: calculateCanMiss(totalPresent, totalLectures, targetPercentage),
    neededLectures: calculateNeededToReachTarget(
      totalPresent,
      totalLectures,
      targetPercentage,
    ),
    profile: {
      college: profile.data?.college?.name ?? null,
      department: profile.data?.department?.name ?? null,
      division: profile.data?.division?.division_name ?? null,
      semester: profile.data?.semester?.semester_number ?? null,
    },
    subjects: subjectAttendance,
    todayTimetable,
  };
}

export async function getAttendanceInsights(userId: string) {
  const subjects = await getSubjectAttendance(userId);
  const riskSubjects = subjects.filter(
    (s) => s.total > 0 && s.percentage < 75,
  );

  const sb = getClient();
  const weeklyTrend = [];

  for (let week = 3; week >= 0; week--) {
    const start = new Date();
    start.setDate(start.getDate() - (week * 7 + 6));
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - week * 7);
    end.setHours(23, 59, 59, 999);

    const { data: weekAttendance } = await sb
      .from("attendance")
      .select("status")
      .eq("user_id", userId)
      .gte("attendance_date", start.toISOString().split("T")[0])
      .lte("attendance_date", end.toISOString().split("T")[0]);

    const present =
      weekAttendance?.filter((a) => a.status === "present").length ?? 0;
    const total =
      weekAttendance?.filter(
        (a) => a.status === "present" || a.status === "absent",
      ).length ?? 0;
    const percentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

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

export async function markAttendance(
  userId: string,
  data: {
    subjectId: string;
    date: string;
    status: string;
    remark?: string;
  },
) {
  const sb = getClient();

  const { data: existing } = await sb
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", data.subjectId)
    .eq("attendance_date", data.date)
    .single();

  let result;
  if (existing) {
    const { data: updated, error } = await sb
      .from("attendance")
      .update({ status: data.status, remarks: data.remark ?? null })
      .eq("id", existing.id)
      .select("*, subject:subjects(id, subject_name, subject_code)")
      .single();
    if (error) throw new Error(error.message);
    result = updated;
  } else {
    const { data: created, error } = await sb
      .from("attendance")
      .insert({
        user_id: userId,
        subject_id: data.subjectId,
        attendance_date: data.date,
        status: data.status,
        remarks: data.remark ?? null,
      })
      .select("*, subject:subjects(id, subject_name, subject_code)")
      .single();
    if (error) throw new Error(error.message);
    result = created;
  }

  return result;
}

export async function bulkMarkAttendance(
  userId: string,
  entries: { subjectId: string; date: string; status: string; remark?: string }[],
) {
  const results = [];
  for (const entry of entries) {
    const result = await markAttendance(userId, entry);
    results.push(result);
  }
  return results;
}

export async function getAttendanceForDate(userId: string, date: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from("attendance")
    .select(
      "id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
    )
    .eq("user_id", userId)
    .eq("attendance_date", date);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAttendanceForSubject(
  userId: string,
  subjectId: string,
) {
  const sb = getClient();
  const { data, error } = await sb
    .from("attendance")
    .select("id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .order("attendance_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAttendanceHistory(
  userId: string,
  page: number,
  limit: number,
) {
  const sb = getClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const [recordsResult, countResult] = await Promise.all([
    sb
      .from("attendance")
      .select(
        "id, subject_id, attendance_date, status, remarks, lecture_number, subject:subjects(id, subject_name, subject_code)",
      )
      .eq("user_id", userId)
      .order("attendance_date", { ascending: false })
      .range(from, to),
    sb
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

export async function getTimetable(userId: string) {
  const sb = getClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("division_id")
    .eq("id", userId)
    .single();

  if (!profile?.division_id) return [];

  const { data, error } = await sb
    .from("timetables")
    .select(
      "id, subject_id, division_id, day_of_week, start_time, end_time, room_number, lecture_number, lecture_type, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
    )
    .eq("division_id", profile.division_id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSetupStatus(userId: string) {
  const sb = getClient();
  const { data: profile } = await sb
    .from("profiles")
    .select("onboarding_completed, college_id, department_id, semester_id, division_id")
    .eq("id", userId)
    .single();

  let timetableCount = 0;
  if (profile?.division_id) {
    const { count } = await sb
      .from("timetables")
      .select("id", { count: "exact", head: true })
      .eq("division_id", profile.division_id);
    timetableCount = count ?? 0;
  }

  return {
    onboardingCompleted: profile?.onboarding_completed ?? false,
    hasCollege: !!profile?.college_id,
    hasSemester: !!profile?.semester_id,
    hasDivision: !!profile?.division_id,
    timetableCount,
  };
}

interface SubjectInput {
  name: string;
  code: string;
  facultyName?: string;
}

interface TimetableInput {
  subjectIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export async function saveTimetable(
  userId: string,
  semesterId: string,
  divisionId: string,
  subjects: SubjectInput[],
  timetable: TimetableInput[],
) {
  const sb = getClient();
  const createdSubjects: { id: string; subject_name: string; subject_code: string }[] = [];

  for (const subject of subjects) {
    let facultyId: string | null = null;

    if (subject.facultyName) {
      const { data: profile } = await sb
        .from("profiles")
        .select("department_id")
        .eq("id", userId)
        .single();

      if (profile?.department_id) {
        const { data: existingFaculty } = await sb
          .from("faculty")
          .select("id")
          .eq("full_name", subject.facultyName)
          .eq("department_id", profile.department_id)
          .limit(1)
          .maybeSingle();

        if (existingFaculty) {
          facultyId = existingFaculty.id;
        } else {
          const { data: newFaculty } = await sb
            .from("faculty")
            .insert({
              full_name: subject.facultyName,
              department_id: profile.department_id,
            })
            .select("id")
            .single();
          facultyId = newFaculty?.id ?? null;
        }
      }
    }

    const { data: existingSubject } = await sb
      .from("subjects")
      .select("id")
      .eq("subject_code", subject.code)
      .eq("semester_id", semesterId)
      .limit(1)
      .maybeSingle();

    let subjectId: string;

    if (existingSubject) {
      await sb
        .from("subjects")
        .update({
          subject_name: subject.name,
          ...(facultyId ? { faculty_id: facultyId } : {}),
        })
        .eq("id", existingSubject.id);
      subjectId = existingSubject.id;
    } else {
      const { data: newSubject } = await sb
        .from("subjects")
        .insert({
          subject_name: subject.name,
          subject_code: subject.code,
          semester_id: semesterId,
          ...(facultyId ? { faculty_id: facultyId } : {}),
        })
        .select("id")
        .single();
      subjectId = newSubject!.id;
    }

    createdSubjects.push({ id: subjectId, subject_name: subject.name, subject_code: subject.code });
  }

  await sb.from("timetables").delete().eq("division_id", divisionId);

  const createdTimetable = [];
  for (const entry of timetable) {
    const subject = createdSubjects[entry.subjectIndex];
    if (!subject) continue;

    const [startHour, startMin] = entry.startTime.split(":").map(Number);
    const [endHour, endMin] = entry.endTime.split(":").map(Number);
    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

    const { data: created } = await sb
      .from("timetables")
      .insert({
        subject_id: subject.id,
        division_id: divisionId,
        day_of_week: entry.dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room_number: entry.room ?? null,
      })
      .select("id, subject_id, division_id, day_of_week, start_time, end_time, room_number, lecture_number, lecture_type, subject:subjects(id, subject_name, subject_code)")
      .single();

    if (created) createdTimetable.push(created);
  }

  return { subjects: createdSubjects, timetable: createdTimetable };
}

function calculateCanMiss(
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

function calculateNeededToReachTarget(
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
