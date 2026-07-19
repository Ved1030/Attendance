import { ProfileRepository, type ProfileWithRelations } from "../repositories/profile.repository.js";
import { AppError } from "../types/index.js";
import type { UpdateProfileInput, OnboardingInput } from "../validators/profile.validator.js";

const profileRepository = new ProfileRepository();

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileWithRelations> {
    const profile = await profileRepository.findOrCreate(userId);

    if (!profile) {
      throw AppError.notFound("Profile not found. Please complete your registration.");
    }

    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<ProfileWithRelations> {
    const profile = await profileRepository.findById(userId);

    if (!profile) {
      throw AppError.notFound("Profile not found");
    }

    const updateData: Record<string, unknown> = {};

    if (data.fullName !== undefined) {
      updateData.full_name = data.fullName;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatar_url = data.avatarUrl;
    }
    if (data.targetAttendance !== undefined) {
      updateData.target_attendance = data.targetAttendance;
    }
    if (data.theme !== undefined) {
      updateData.theme = data.theme;
    }

    return profileRepository.update(userId, updateData);
  }

  async completeOnboarding(userId: string, data: OnboardingInput): Promise<ProfileWithRelations> {
    const profile = await profileRepository.findById(userId);

    if (!profile) {
      throw AppError.notFound("Profile not found");
    }

    const fkErrors = await profileRepository.validateForeignKeys({
      collegeId: data.collegeId,
      departmentId: data.departmentId,
      semesterId: data.semesterId,
      divisionId: data.divisionId,
    });

    if (fkErrors) {
      const mapped: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(fkErrors)) {
        mapped[key] = [value];
      }
      throw AppError.badRequest("Validation failed", mapped);
    }

    return profileRepository.update(userId, {
      college_id: data.collegeId,
      department_id: data.departmentId,
      semester_id: data.semesterId,
      division_id: data.divisionId,
      target_attendance: data.targetAttendance,
      theme: data.theme,
      onboarding_completed: true,
    });
  }
}
