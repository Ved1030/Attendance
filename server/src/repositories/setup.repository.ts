import { supabaseAdmin } from "../config/supabase.js";

export interface SubjectInput {
  name: string;
  code: string;
  facultyName?: string;
}

export interface TimetableInput {
  subjectIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export class SetupRepository {
  async saveTimetable(
    userId: string,
    semesterId: string,
    divisionId: string,
    subjects: SubjectInput[],
    timetable: TimetableInput[],
  ) {
    const createdSubjects: { id: string; subject_name: string; subject_code: string }[] = [];

    for (const subject of subjects) {
      let facultyId: string | null = null;

      if (subject.facultyName) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("department_id")
          .eq("id", userId)
          .single();

        if ((profile as { department_id: string | null } | null)?.department_id) {
          const deptId = (profile as { department_id: string }).department_id;

          const { data: existingFaculty } = await supabaseAdmin
            .from("faculty")
            .select("id")
            .eq("full_name", subject.facultyName)
            .eq("department_id", deptId)
            .limit(1)
            .maybeSingle();

          if (existingFaculty) {
            facultyId = (existingFaculty as { id: string }).id;
          } else {
            const { data: newFaculty } = await supabaseAdmin
              .from("faculty")
              .insert({ full_name: subject.facultyName, department_id: deptId })
              .select("id")
              .single();
            if (newFaculty) facultyId = (newFaculty as { id: string }).id;
          }
        }
      }

      const { data: existingSubject } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .eq("subject_code", subject.code)
        .eq("semester_id", semesterId)
        .limit(1)
        .maybeSingle();

      let subjectId: string;

      if (existingSubject) {
        subjectId = (existingSubject as { id: string }).id;
        const updateData: Record<string, unknown> = {
          subject_name: subject.name,
        };
        if (facultyId) updateData.faculty_id = facultyId;

        await supabaseAdmin
          .from("subjects")
          .update(updateData)
          .eq("id", subjectId);
      } else {
        const insertData: Record<string, unknown> = {
          subject_name: subject.name,
          subject_code: subject.code,
          semester_id: semesterId,
        };
        if (facultyId) insertData.faculty_id = facultyId;

        const { data: newSubject } = await supabaseAdmin
          .from("subjects")
          .insert(insertData)
          .select("id")
          .single();

        subjectId = (newSubject as { id: string }).id;
      }

      createdSubjects.push({ id: subjectId, subject_name: subject.name, subject_code: subject.code });
    }

    await supabaseAdmin
      .from("timetables")
      .delete()
      .eq("division_id", divisionId);

    const createdTimetable = [];

    for (const entry of timetable) {
      const subject = createdSubjects[entry.subjectIndex];
      if (!subject) continue;

      const [startHour, startMin] = entry.startTime.split(":").map(Number);
      const [endHour, endMin] = entry.endTime.split(":").map(Number);
      const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`;
      const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

      const { data: created } = await supabaseAdmin
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

    return {
      subjects: createdSubjects,
      timetable: createdTimetable,
    };
  }

  async getTimetable(userId: string) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("division_id")
      .eq("id", userId)
      .single();

    const p = profile as { division_id: string | null } | null;
    if (!p?.division_id) return [];

    const { data, error } = await supabaseAdmin
      .from("timetables")
      .select(
        "id, subject_id, division_id, day_of_week, start_time, end_time, room_number, lecture_number, lecture_type, subject:subjects(id, subject_name, subject_code, faculty:faculty(id, full_name))",
      )
      .eq("division_id", p.division_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getSetupStatus(userId: string) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("onboarding_completed, college_id, semester_id, division_id")
      .eq("id", userId)
      .single();

    const p = profile as Record<string, unknown> | null;

    let timetableCount = 0;
    if (p?.division_id) {
      const { count } = await supabaseAdmin
        .from("timetables")
        .select("id", { count: "exact", head: true })
        .eq("division_id", p.division_id as string);
      timetableCount = count ?? 0;
    }

    return {
      onboardingCompleted: (p?.onboarding_completed as boolean) ?? false,
      hasCollege: !!p?.college_id,
      hasSemester: !!p?.semester_id,
      hasDivision: !!p?.division_id,
      timetableCount,
    };
  }
}
