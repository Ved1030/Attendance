export interface ParsedSubject {
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
  facultyName?: string;
}

export interface ParsedLecture {
  day: string;
  startTime: string;
  endTime: string;
  batch: string;
  subjectCode: string;
  room?: string;
  lectureType: string;
}

export interface ParsedTimetable {
  subjects: ParsedSubject[];
  lectures: ParsedLecture[];
}
