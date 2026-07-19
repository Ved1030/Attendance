import type {
  ApiResponse,
  SetupStatus,
  TimetableSubject,
  TimetableEntry,
  SavedTimetableEntry,
} from "@/types";

export async function getSetupStatus(): Promise<ApiResponse<SetupStatus>> {
  try {
    const response = await fetch("/api/setup/status");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch setup status" };
  }
}

export async function saveTimetable(
  subjects: TimetableSubject[],
  timetable: TimetableEntry[],
): Promise<
  ApiResponse<{
    subjects: { id: string; subject_name: string; subject_code: string }[];
    timetable: SavedTimetableEntry[];
  }>
> {
  try {
    const response = await fetch("/api/setup/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects, timetable }),
    });
    return await response.json();
  } catch {
    return { success: false, message: "Failed to save timetable" };
  }
}

export async function getTimetable(): Promise<ApiResponse<SavedTimetableEntry[]>> {
  try {
    const response = await fetch("/api/setup/timetable");
    return await response.json();
  } catch {
    return { success: false, message: "Failed to fetch timetable" };
  }
}

const setupApi = {
  getSetupStatus,
  saveTimetable,
  getTimetable,
};

export default setupApi;
