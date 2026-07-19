import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

export const saveTimetableSchema = z.object({
  subjects: z
    .array(
      z.object({
        name: z.string().min(1, "Subject name is required").max(255),
        code: z.string().min(1, "Subject code is required").max(20),
        facultyName: z.string().max(255).optional(),
      }),
    )
    .min(1, "At least one subject is required"),
  timetable: z
    .array(
      z.object({
        subjectIndex: z.number().int().min(0, "Invalid subject reference"),
        dayOfWeek: z.number().int().min(0).max(6, "Day must be 0-6 (Sun-Sat)"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
        room: z.string().max(50).optional(),
      }),
    )
    .min(1, "At least one timetable entry is required"),
});

export const uploadFileSchema = z.object({
  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    mimetype: z.string(),
    size: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
  }),
});

export type SaveTimetableInput = z.infer<typeof saveTimetableSchema>;
