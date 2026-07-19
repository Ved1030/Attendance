import { SetupRepository } from "../repositories/setup.repository.js";
import { ProfileRepository } from "../repositories/profile.repository.js";
import { AppError } from "../types/index.js";
import type {
  SaveTimetableInput,
} from "../validators/setup.validator.js";

const setupRepository = new SetupRepository();
const profileRepository = new ProfileRepository();

export class SetupService {
  async saveTimetable(userId: string, data: SaveTimetableInput) {
    const profile = await profileRepository.findById(userId);

    if (!profile) {
      throw AppError.notFound("Profile not found");
    }

    if (!profile.semester_id || !profile.division_id) {
      throw AppError.badRequest(
        "Please complete the onboarding first (select semester and division)",
      );
    }

    const result = await setupRepository.saveTimetable(
      userId,
      profile.semester_id,
      profile.division_id,
      data.subjects.map((s) => ({
        name: s.name,
        code: s.code,
        ...(s.facultyName ? { facultyName: s.facultyName } : {}),
      })),
      data.timetable.map((t) => ({
        subjectIndex: t.subjectIndex,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        ...(t.room ? { room: t.room } : {}),
      })),
    );

    return result;
  }

  async getTimetable(userId: string) {
    return setupRepository.getTimetable(userId);
  }

  async getSetupStatus(userId: string) {
    return setupRepository.getSetupStatus(userId);
  }
}
