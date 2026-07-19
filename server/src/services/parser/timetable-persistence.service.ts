import { supabaseAdmin } from "../../config/supabase.js";
import type { ParsedTimetable, ParsedSubject, ParsedLecture } from "./types.js";

export interface PersistenceResult {
  success: boolean;
  subjects: number;
  faculty: number;
  lectures: number;
}

export class TimetablePersistenceService {
  async saveOrReplaceTimetable(
    userId: string,
    divisionId: string,
    departmentId: string,
    semesterId: string,
    parsed: ParsedTimetable,
  ): Promise<PersistenceResult> {
    console.log("[DB] Saving timetable...");

    const { data, error } = await supabaseAdmin.rpc("save_timetable", {
      p_user_id: userId,
      p_division_id: divisionId,
      p_department_id: departmentId,
      p_semester_id: semesterId,
      p_subjects: JSON.parse(JSON.stringify(parsed.subjects)),
      p_lectures: JSON.parse(JSON.stringify(parsed.lectures)),
    });

    if (error) {
      console.error("[DB] Transaction failed:", error.message);
      throw new Error(`Failed to save timetable: ${error.message}`);
    }

    const result = data as PersistenceResult;

    console.log(`[DB] Subjects inserted: ${result.subjects}`);
    console.log(`[DB] Faculty inserted: ${result.faculty}`);
    console.log(`[DB] Lectures inserted: ${result.lectures}`);
    console.log("[DB] Transaction committed.");

    return result;
  }
}
