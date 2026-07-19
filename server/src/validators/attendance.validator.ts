import { z } from "zod";

export const markAttendanceSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["present", "absent", "cancelled", "holiday", "extra"]),
  remark: z.string().max(255).optional(),
});

export const bulkMarkAttendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["present", "absent", "cancelled", "holiday", "extra"]),
        remark: z.string().max(255).optional(),
      }),
    )
    .min(1, "At least one entry is required"),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
