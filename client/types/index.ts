export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  attendanceGoal: number;
  collegeId: string | null;
  departmentId: string | null;
  divisionId: string | null;
  semesterId: string | null;
  createdAt: string;
  updatedAt: string;
  college: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  division: {
    id: string;
    division_name: string;
  } | null;
  semester: {
    id: string;
    semester_number: number;
  } | null;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  profile: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
  };
  needsOnboarding: boolean;
}

export interface OnboardingData {
  collegeId: string;
  departmentId: string;
  semesterId: string;
  divisionId: string;
  targetAttendance: number;
  theme: "system" | "light" | "dark";
}

export interface College {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  collegeId: string;
}

export interface Semester {
  id: string;
  semester_number: number;
  departmentId: string;
}

export interface Division {
  id: string;
  division_name: string;
  semesterId: string;
}

export interface SetupStatus {
  onboardingCompleted: boolean;
  hasCollege: boolean;
  hasSemester: boolean;
  hasDivision: boolean;
  timetableCount: number;
}

export interface TimetableSubject {
  name: string;
  code: string;
  facultyName?: string;
}

export interface TimetableEntry {
  subjectIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface SavedTimetableEntry {
  id: string;
  subject_id: string;
  division_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  lecture_number: number;
  lecture_type: string | null;
  subject: {
    id: string;
    subject_name: string;
    subject_code: string;
    faculty?: { id: string; full_name: string } | null;
  };
}
