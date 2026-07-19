import type {
  AIProvider,
  TimetableExtractionResult,
  ExtractedSubject,
  ExtractedTimetableEntry,
} from "../types.js";
import { ValidatorService, type ValidationResult } from "../validator.service.js";

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export interface ProcessedTimetable {
  subjects: ExtractedSubject[];
  timetable: Array<ExtractedTimetableEntry & { dayOfWeek: number }>;
}

export class TimetableProcessor {
  private validator: ValidatorService;

  constructor() {
    this.validator = new ValidatorService();
  }

  async process(
    aiProvider: AIProvider,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<{
    result: ProcessedTimetable;
    warnings: string[];
  }> {
    console.log("[TimetableProcessor] Starting AI extraction...");

    const raw = await aiProvider.extractTimetable(fileBuffer, mimeType);

    console.log("[TimetableProcessor] AI extraction complete. Subjects:", raw.subjects.length, "Entries:", raw.timetable.length);

    const validation = this.validator.validateTimetable(raw);

    if (!validation.valid || !validation.data) {
      throw new Error(
        `Validation failed: ${validation.errors.join("; ")}`,
      );
    }

    const normalized = this.normalize(validation.data);

    return {
      result: normalized,
      warnings: validation.errors,
    };
  }

  private normalize(data: TimetableExtractionResult): ProcessedTimetable {
    const subjectCodeToIndex = new Map<string, number>();
    const dedupedSubjects: ExtractedSubject[] = [];

    for (const subject of data.subjects) {
      const code = subject.subject_code.toUpperCase();
      if (!subjectCodeToIndex.has(code)) {
        subjectCodeToIndex.set(code, dedupedSubjects.length);
        dedupedSubjects.push({ ...subject, subject_code: code });
      }
    }

    const timetable = data.timetable.map((entry) => ({
      ...entry,
      subject_code: entry.subject_code.toUpperCase(),
      dayOfWeek: DAY_NAME_TO_NUMBER[entry.day] ?? 1,
    }));

    return { subjects: dedupedSubjects, timetable };
  }
}
