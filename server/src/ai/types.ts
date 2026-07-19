export interface ExtractedSubject {
  subject_name: string;
  subject_code: string;
  faculty_name: string;
  lecture_type: string;
}

export interface ExtractedTimetableEntry {
  subject_code: string;
  day: string;
  start_time: string;
  end_time: string;
  lecture_type: string;
  room: string;
}

export interface TimetableExtractionResult {
  subjects: ExtractedSubject[];
  timetable: ExtractedTimetableEntry[];
}

export interface ExtractedEvent {
  title: string;
  date: string;
  type: string;
  description: string;
}

export interface CalendarExtractionResult {
  events: ExtractedEvent[];
}

export interface AIProvider {
  extractTimetable(fileBuffer: Buffer, mimeType: string): Promise<TimetableExtractionResult>;
  extractAcademicCalendar(fileBuffer: Buffer, mimeType: string): Promise<CalendarExtractionResult>;
}

export type DocumentType = "TIMETABLE" | "ACADEMIC_CALENDAR";

export type ProcessingStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ProcessingJob {
  id: string;
  userId: string;
  fileId: string;
  fileType: DocumentType;
  storagePath: string;
  status: ProcessingStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
