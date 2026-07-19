import type { ParsedTimetable } from "./types.js";

const VALID_DAYS = new Set([
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
]);

const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const MAX_HOUR = 28;

export interface ValidationReport {
  subjects: number;
  lectures: number;
  warnings: string[];
  errors: string[];
}

export function validateParsedTimetable(parsed: ParsedTimetable): ValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  const seen = new Set<string>();

  for (const lecture of parsed.lectures) {
    if (!lecture.startTime) {
      errors.push("Lecture missing startTime");
    }
    if (!lecture.endTime) {
      errors.push("Lecture missing endTime");
    }
    if (!lecture.subjectCode) {
      errors.push("Lecture missing subjectCode");
    }
    if (!lecture.day) {
      errors.push("Lecture missing day");
    }

    if (lecture.day && !VALID_DAYS.has(lecture.day)) {
      warnings.push(`Unknown day "${lecture.day}"`);
    }

    const st = lecture.startTime;
    const et = lecture.endTime;
    if (st && et) {
      const sm = st.match(TIME_RE);
      const em = et.match(TIME_RE);
      if (!sm) {
        warnings.push(`Invalid format for startTime: "${st}"`);
      }
      if (!em) {
        warnings.push(`Invalid format for endTime: "${et}"`);
      }
      if (sm && em) {
        const startMin = parseInt(sm[1]!, 10) * 60 + parseInt(sm[2]!, 10);
        const endMin = parseInt(em[1]!, 10) * 60 + parseInt(em[2]!, 10);
        if (endMin > MAX_HOUR * 60) {
          warnings.push(`End time exceeds 28:00: "${et}"`);
        }
        if (startMin >= endMin) {
          warnings.push(`Invalid time: start "${st}" >= end "${et}"`);
        }
      }
    }

    const key = `${lecture.day}|${lecture.startTime}|${lecture.endTime}|${lecture.batch}|${lecture.subjectCode}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate lecture: ${key}`);
    }
    seen.add(key);
  }

  return {
    subjects: parsed.subjects.length,
    lectures: parsed.lectures.length,
    warnings,
    errors,
  };
}
