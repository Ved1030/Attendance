export const FILE_TYPE = {
  TIMETABLE: "TIMETABLE",
  ACADEMIC_CALENDAR: "ACADEMIC_CALENDAR",
} as const;

export type FileTypeValue = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];

const FILE_TYPE_STORAGE_SEGMENT: Record<FileTypeValue, string> = {
  [FILE_TYPE.TIMETABLE]: "timetable",
  [FILE_TYPE.ACADEMIC_CALENDAR]: "academic-calendar",
};

const FILE_TYPE_PROFILE_FIELD: Record<FileTypeValue, string> = {
  [FILE_TYPE.TIMETABLE]: "timetable_uploaded",
  [FILE_TYPE.ACADEMIC_CALENDAR]: "calendar_uploaded",
};

export function toStorageSegment(fileType: FileTypeValue): string {
  return FILE_TYPE_STORAGE_SEGMENT[fileType];
}

export function toProfileField(fileType: FileTypeValue): string {
  return FILE_TYPE_PROFILE_FIELD[fileType];
}
