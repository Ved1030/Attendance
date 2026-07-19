import type {
  TimetableExtractionResult,
  CalendarExtractionResult,
  ExtractedTimetableEntry,
  ExtractedEvent,
} from "./types.js";

const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const VALID_EVENT_TYPES = [
  "HOLIDAY",
  "EXAM",
  "MID_SEMESTER",
  "END_SEMESTER",
  "FESTIVAL",
  "VACATION",
  "SUBMISSION",
  "ACADEMIC_EVENT",
];

const VALID_LECTURE_TYPES = ["LECTURE", "LAB", "TUTORIAL", "WORKSHOP"];

export interface ValidationResult<T> {
  valid: boolean;
  data: T | null;
  errors: string[];
}

export class ValidatorService {
  validateTimetable(data: TimetableExtractionResult): ValidationResult<TimetableExtractionResult> {
    const errors: string[] = [];

    if (!data.subjects || !Array.isArray(data.subjects) || data.subjects.length === 0) {
      errors.push("No subjects found in the document");
    }

    if (!data.timetable || !Array.isArray(data.timetable) || data.timetable.length === 0) {
      errors.push("No timetable entries found in the document");
    }

    const validSubjectCodes = new Set<string>();
    const subjectCodeCounts = new Map<string, number>();

    if (data.subjects) {
      for (const subject of data.subjects) {
        if (!subject.subject_code || subject.subject_code.trim() === "") {
          errors.push("Subject found with empty code");
          continue;
        }

        const code = subject.subject_code.trim().toUpperCase();
        subjectCodeCounts.set(code, (subjectCodeCounts.get(code) ?? 0) + 1);
        validSubjectCodes.add(code);

        if (!subject.subject_name || subject.subject_name.trim() === "") {
          errors.push(`Subject ${code} has empty name`);
        }
      }
    }

    const cleanedTimetable: ExtractedTimetableEntry[] = [];
    const seenEntries = new Set<string>();

    if (data.timetable) {
      for (const entry of data.timetable) {
        const code = entry.subject_code?.trim().toUpperCase() ?? "";
        if (!code) {
          errors.push("Timetable entry with empty subject code skipped");
          continue;
        }

        if (!VALID_DAYS.includes(entry.day)) {
          errors.push(`Invalid day "${entry.day}" in timetable entry skipped`);
          continue;
        }

        if (!this.isValidTime(entry.start_time)) {
          errors.push(`Invalid start_time "${entry.start_time}" skipped`);
          continue;
        }

        if (!this.isValidTime(entry.end_time)) {
          errors.push(`Invalid end_time "${entry.end_time}" skipped`);
          continue;
        }

        if (!this.isTimeBefore(entry.start_time, entry.end_time)) {
          errors.push(`start_time ${entry.start_time} is not before end_time ${entry.end_time} skipped`);
          continue;
        }

        const lectureType = VALID_LECTURE_TYPES.includes(entry.lecture_type?.toUpperCase())
          ? entry.lecture_type.toUpperCase()
          : "LECTURE";

        const dedupeKey = `${code}|${entry.day}|${entry.start_time}|${entry.end_time}`;
        if (seenEntries.has(dedupeKey)) {
          continue;
        }
        seenEntries.add(dedupeKey);

        cleanedTimetable.push({
          subject_code: code,
          day: entry.day,
          start_time: entry.start_time,
          end_time: entry.end_time,
          lecture_type: lectureType,
          room: entry.room ?? "",
        });
      }
    }

    if (cleanedTimetable.length === 0 && errors.length === 0) {
      errors.push("No valid timetable entries after validation");
    }

    const cleanedSubjects = (data.subjects ?? [])
      .filter((s) => s.subject_code && s.subject_code.trim() !== "")
      .map((s) => ({
        ...s,
        subject_code: s.subject_code.trim().toUpperCase(),
        subject_name: s.subject_name.trim(),
        faculty_name: (s.faculty_name ?? "").trim(),
        lecture_type: VALID_LECTURE_TYPES.includes(s.lecture_type?.toUpperCase())
          ? s.lecture_type.toUpperCase()
          : "LECTURE",
      }));

    const referencedCodes = new Set(cleanedTimetable.map((e) => e.subject_code));
    const orphanCodes = [...referencedCodes].filter((code) => !validSubjectCodes.has(code));
    for (const code of orphanCodes) {
      cleanedSubjects.push({
        subject_name: code,
        subject_code: code,
        faculty_name: "",
        lecture_type: "LECTURE",
      });
    }

    if (errors.length > 0 && cleanedTimetable.length === 0) {
      return { valid: false, data: null, errors };
    }

    return {
      valid: true,
      data: { subjects: cleanedSubjects, timetable: cleanedTimetable },
      errors,
    };
  }

  validateCalendar(data: CalendarExtractionResult): ValidationResult<CalendarExtractionResult> {
    const errors: string[] = [];

    if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
      return { valid: false, data: null, errors: ["No events found in the document"] };
    }

    const cleanedEvents: ExtractedEvent[] = [];
    const seenKeys = new Set<string>();

    for (const event of data.events) {
      if (!event.title || event.title.trim() === "") {
        errors.push("Event with empty title skipped");
        continue;
      }

      if (!event.date || !this.isValidDate(event.date)) {
        errors.push(`Invalid date "${event.date}" for event "${event.title}" skipped`);
        continue;
      }

      const type = VALID_EVENT_TYPES.includes(event.type?.toUpperCase())
        ? event.type.toUpperCase()
        : "ACADEMIC_EVENT";

      const dedupeKey = `${event.title.trim().toLowerCase()}|${event.date}|${type}`;
      if (seenKeys.has(dedupeKey)) {
        continue;
      }
      seenKeys.add(dedupeKey);

      cleanedEvents.push({
        title: event.title.trim(),
        date: event.date,
        type,
        description: (event.description ?? "").trim(),
      });
    }

    if (cleanedEvents.length === 0) {
      return { valid: false, data: null, errors: [...errors, "No valid events after validation"] };
    }

    return {
      valid: cleanedEvents.length > 0,
      data: { events: cleanedEvents },
      errors,
    };
  }

  private isValidTime(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time);
  }

  private isValidDate(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  }

  private isTimeBefore(start: string, end: string): boolean {
    return start.localeCompare(end) < 0;
  }
}
