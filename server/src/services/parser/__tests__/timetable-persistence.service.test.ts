import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "../../../config/supabase.js";
import { TimetablePersistenceService } from "../timetable-persistence.service.js";
import type { ParsedTimetable } from "../types.js";

const service = new TimetablePersistenceService();

let userId: string;
let divisionId: string;
let departmentId: string;
let semesterId: string;
let collegeId: string;

const sampleSubjects = [
  { subjectCode: "SA", subjectName: "System Analysis", facultyCode: "V" },
  { subjectCode: "DevOps", subjectName: "DevOps", facultyCode: "AJ" },
  { subjectCode: "CN", subjectName: "Computer Networks", facultyCode: "AP" },
];

const sampleLectures = [
  {
    day: "Monday",
    startTime: "08:00",
    endTime: "09:00",
    batch: "I2-1",
    subjectCode: "SA",
    room: "L3",
    lectureType: "LAB",
  },
  {
    day: "Tuesday",
    startTime: "09:00",
    endTime: "10:00",
    batch: "I2-2",
    subjectCode: "DevOps",
    room: "L6",
    lectureType: "LAB",
  },
  {
    day: "Wednesday",
    startTime: "10:00",
    endTime: "11:00",
    batch: "I1-1",
    subjectCode: "CN",
    room: "305",
    lectureType: "LECTURE",
  },
];

let createdProfileId: string | null = null;

beforeAll(async () => {
  const { data: college } = await supabaseAdmin
    .from("colleges")
    .insert({ name: "Test College" })
    .select("id")
    .single();
  collegeId = college!.id;

  const { data: dept } = await supabaseAdmin
    .from("departments")
    .insert({ name: "Test Department", college_id: collegeId })
    .select("id")
    .single();
  departmentId = dept!.id;

  const { data: sem } = await supabaseAdmin
    .from("semesters")
    .insert({ semester_number: 1, department_id: departmentId })
    .select("id")
    .single();
  semesterId = sem!.id;

  const { data: div } = await supabaseAdmin
    .from("divisions")
    .insert({ division_name: "Test Division", semester_id: semesterId })
    .select("id")
    .single();
  divisionId = div!.id;

  const testEmail = `test-${Date.now()}@example.com`;
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: "password123",
    email_confirm: true,
  });

  if (authError || !authUser?.user) {
    if (authError?.message?.includes("already exists") || authError?.message?.includes("duplicate")) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", testEmail)
        .single();
      userId = existingProfile!.id;
    } else {
      throw authError;
    }
  } else {
    userId = authUser.user.id;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      full_name: "Test User",
      email: testEmail,
      college_id: collegeId,
      department_id: departmentId,
      division_id: divisionId,
      semester_id: semesterId,
      onboarding_completed: true,
    })
    .select("id")
    .single();
  createdProfileId = profile!.id;
});

afterAll(async () => {
  await supabaseAdmin.from("timetables").delete().eq("division_id", divisionId);
  await supabaseAdmin.from("subjects").delete().eq("semester_id", semesterId);
  await supabaseAdmin.from("faculty").delete().eq("department_id", departmentId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  await supabaseAdmin.from("divisions").delete().eq("id", divisionId);
  await supabaseAdmin.from("semesters").delete().eq("id", semesterId);
  await supabaseAdmin.from("departments").delete().eq("id", departmentId);
  await supabaseAdmin.from("colleges").delete().eq("id", collegeId);

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch {
  }
});

describe("TimetablePersistenceService", () => {
  it("saves a timetable on first upload", async () => {
    const parsed: ParsedTimetable = {
      subjects: sampleSubjects,
      lectures: sampleLectures,
    };

    const result = await service.saveOrReplaceTimetable(
      userId,
      divisionId,
      departmentId,
      semesterId,
      parsed,
    );

    expect(result.success).toBe(true);
    expect(result.subjects).toBe(3);
    expect(result.faculty).toBe(3);
    expect(result.lectures).toBe(3);
  });

  it("handles second upload (no duplicates)", async () => {
    const parsed: ParsedTimetable = {
      subjects: sampleSubjects,
      lectures: sampleLectures,
    };

    const result = await service.saveOrReplaceTimetable(
      userId,
      divisionId,
      departmentId,
      semesterId,
      parsed,
    );

    expect(result.success).toBe(true);
    expect(result.subjects).toBe(0);
    expect(result.faculty).toBe(0);
    expect(result.lectures).toBe(3);
  });

  it("rolls back on invalid FK (non-existent division)", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const parsed: ParsedTimetable = {
      subjects: sampleSubjects,
      lectures: sampleLectures,
    };

    await expect(
      service.saveOrReplaceTimetable(
        userId,
        fakeId,
        departmentId,
        semesterId,
        parsed,
      ),
    ).rejects.toThrow();
  });

  it("handles empty lectures gracefully", async () => {
    const parsed: ParsedTimetable = {
      subjects: [],
      lectures: [],
    };

    const result = await service.saveOrReplaceTimetable(
      userId,
      divisionId,
      departmentId,
      semesterId,
      parsed,
    );

    expect(result.success).toBe(true);
    expect(result.subjects).toBe(0);
    expect(result.faculty).toBe(0);
    expect(result.lectures).toBe(0);
  });

  it("reuses existing subjects on re-upload", async () => {
    const parsed: ParsedTimetable = {
      subjects: [
        { subjectCode: "SA", subjectName: "System Analysis", facultyCode: "V" },
      ],
      lectures: [
        {
          day: "Monday",
          startTime: "08:00",
          endTime: "09:00",
          batch: "I2-1",
          subjectCode: "SA",
          room: "L3",
          lectureType: "LAB",
        },
      ],
    };

    const result = await service.saveOrReplaceTimetable(
      userId,
      divisionId,
      departmentId,
      semesterId,
      parsed,
    );

    expect(result.success).toBe(true);
    expect(result.subjects).toBe(0);
    expect(result.faculty).toBe(0);
    expect(result.lectures).toBe(1);
  });
});
