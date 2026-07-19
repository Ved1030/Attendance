import { ProfileRepository } from "../repositories/profile.repository.js";
import type { ProfileWithRelations } from "../repositories/profile.repository.js";

const profileRepository = new ProfileRepository();

export class AuthService {
  static async getProfile(userId: string): Promise<ProfileWithRelations> {
    const profile = await profileRepository.findOrCreate(userId);

    if (!profile) {
      throw new Error("Profile not found. Please complete your registration.");
    }

    return profile;
  }

  static async ensureProfile(
    userId: string,
  ): Promise<ProfileWithRelations> {
    return profileRepository.findOrCreate(userId);
  }
}
