import { supabaseAdmin } from "../config/supabase.js";

const PROFILE_SELECT =
  "id, full_name, avatar_url, email, college_id, department_id, division_id, semester_id, target_attendance, theme, onboarding_completed, setup_completed, timetable_uploaded, calendar_uploaded, created_at, updated_at, college:colleges(id, name), department:departments(id, name), division:divisions(id, division_name), semester:semesters(id, semester_number)";

export interface ProfileWithRelations {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  college_id: string | null;
  department_id: string | null;
  division_id: string | null;
  semester_id: string | null;
  target_attendance: number | null;
  theme: string | null;
  onboarding_completed: boolean | null;
  setup_completed: boolean | null;
  timetable_uploaded: boolean | null;
  calendar_uploaded: boolean | null;
  created_at: string;
  updated_at: string;
  college: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; division_name: string } | null;
  semester: { id: string; semester_number: number } | null;
}

export class ProfileRepository {
  async findById(userId: string): Promise<ProfileWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data as unknown as ProfileWithRelations;
  }

  async create(userId: string): Promise<ProfileWithRelations> {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const fullName = userData?.user?.user_metadata?.full_name ?? null;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, full_name: fullName })
      .select(PROFILE_SELECT)
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);
    return data as unknown as ProfileWithRelations;
  }

  async findOrCreate(userId: string): Promise<ProfileWithRelations> {
    const existing = await this.findById(userId);
    if (existing) return existing;
    return this.create(userId);
  }

  async update(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<ProfileWithRelations> {
    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return updated as unknown as ProfileWithRelations;
  }

  async collegeExists(collegeId: string): Promise<boolean> {
    const { count } = await supabaseAdmin
      .from("colleges")
      .select("id", { count: "exact", head: true })
      .eq("id", collegeId);
    return (count ?? 0) > 0;
  }

  async departmentExists(departmentId: string): Promise<boolean> {
    const { count } = await supabaseAdmin
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("id", departmentId);
    return (count ?? 0) > 0;
  }

  async semesterExists(semesterId: string): Promise<boolean> {
    const { count } = await supabaseAdmin
      .from("semesters")
      .select("id", { count: "exact", head: true })
      .eq("id", semesterId);
    return (count ?? 0) > 0;
  }

  async divisionExists(divisionId: string): Promise<boolean> {
    const { count } = await supabaseAdmin
      .from("divisions")
      .select("id", { count: "exact", head: true })
      .eq("id", divisionId);
    return (count ?? 0) > 0;
  }

  async validateForeignKeys(data: {
    collegeId?: string;
    departmentId?: string;
    semesterId?: string;
    divisionId?: string;
  }): Promise<Record<string, string> | null> {
    const errors: Record<string, string> = {};

    if (data.collegeId && !(await this.collegeExists(data.collegeId))) {
      errors.collegeId = "College not found";
    }
    if (data.departmentId && !(await this.departmentExists(data.departmentId))) {
      errors.departmentId = "Department not found";
    }
    if (data.semesterId && !(await this.semesterExists(data.semesterId))) {
      errors.semesterId = "Semester not found";
    }
    if (data.divisionId && !(await this.divisionExists(data.divisionId))) {
      errors.divisionId = "Division not found";
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }
}
