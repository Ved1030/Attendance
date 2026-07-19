import { supabaseAdmin } from "../config/supabase.js";
import { getAIProvider } from "../ai/index.js";
import { SarvamProvider } from "../ai/providers/sarvam.provider.js";
import { CalendarProcessor } from "../ai/processors/calendar.processor.js";
import { normalizeText } from "./parser/normalizeText.js";
import { TimetableParser } from "./parser/TimetableParser.js";
import { validateParsedTimetable } from "./parser/validator.js";
import { TimetablePersistenceService } from "./parser/timetable-persistence.service.js";
import type { AIProvider, DocumentType, ProcessingJob } from "../ai/types.js";

const processingJobs = new Map<string, ProcessingJob>();

export class UploadProcessingService {
  async startProcessing(
    userId: string,
    fileId: string,
    fileType: DocumentType,
    storagePath: string,
  ): Promise<string> {
    const jobId = `${fileId}-${Date.now()}`;

    const job: ProcessingJob = {
      id: jobId,
      userId,
      fileId,
      fileType,
      storagePath,
      status: "QUEUED",
      progress: 0,
      currentStep: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    };

    processingJobs.set(jobId, job);

    this.processAsync(jobId).catch((err) => {
      console.error(`[UploadProcessing] Unhandled error for job ${jobId}:`, err);
      this.updateJob(jobId, {
        status: "FAILED",
        error: "Unexpected processing error",
        completedAt: new Date(),
      });
    });

    return jobId;
  }

  getJobStatus(jobId: string): ProcessingJob | null {
    return processingJobs.get(jobId) ?? null;
  }

  getUserJobs(userId: string): ProcessingJob[] {
    const jobs: ProcessingJob[] = [];
    for (const job of processingJobs.values()) {
      if (job.userId === userId) jobs.push(job);
    }
    return jobs;
  }

  private updateJob(jobId: string, updates: Partial<ProcessingJob>): void {
    const job = processingJobs.get(jobId);
    if (!job) return;
    Object.assign(job, updates);
  }

  private async processAsync(jobId: string): Promise<void> {
    const job = processingJobs.get(jobId);
    if (!job) return;

    try {
      this.updateJob(jobId, {
        status: "PROCESSING",
        progress: 5,
        currentStep: "Downloading file...",
        startedAt: new Date(),
      });

      const { buffer, mimeType } = await this.downloadFromStorage(job.storagePath);

      this.updateJob(jobId, { progress: 20, currentStep: "Analyzing document..." });

      const aiProvider = getAIProvider();

      if (job.fileType === "TIMETABLE") {
        await this.processTimetable(jobId, aiProvider, buffer, mimeType);
      } else {
        await this.processCalendar(jobId, aiProvider, buffer, mimeType);
      }

      await supabaseAdmin
        .from("uploaded_files")
        .update({ upload_status: "PROCESSED" })
        .eq("id", job.fileId);

      this.updateJob(jobId, {
        status: "COMPLETED",
        progress: 100,
        currentStep: "Done",
        completedAt: new Date(),
      });

      console.log(`[UploadProcessing] Job ${jobId} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown processing error";
      console.error(`[UploadProcessing] Job ${jobId} failed:`, message);

      this.updateJob(jobId, {
        status: "FAILED",
        error: message,
        completedAt: new Date(),
      });

      await supabaseAdmin
        .from("uploaded_files")
        .update({ upload_status: "FAILED" })
        .eq("id", job.fileId);
    }
  }

  private async processTimetable(
    jobId: string,
    aiProvider: AIProvider,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.updateJob(jobId, { progress: 30, currentStep: "Extracting text from document..." });

    const provider = aiProvider as SarvamProvider;
    const rawText = await provider.extractTextFromDocument(buffer, mimeType);

    this.updateJob(jobId, { progress: 50, currentStep: "Normalizing and parsing timetable..." });

    const normalized = normalizeText(rawText);

    const parser = new TimetableParser();
    const parsed = parser.parse(normalized);

    console.log("[Parser] Subjects:", parsed.subjects.length);
    console.log("[Parser] Lectures:", parsed.lectures.length);

    const days = [...new Set(parsed.lectures.map((l) => l.day))].sort();
    console.log("[Parser] Days:");
    for (const day of days) {
      console.log(day);
    }

    console.log("\n========== PARSED TIMETABLE ==========");
    const preview = JSON.stringify(
      {
        subjects: parsed.subjects,
        lectures: parsed.lectures,
      },
      null,
      2,
    );

    if (preview.length > 10000) {
      console.log(preview.slice(0, 10000) + "\n... [truncated]");
    } else {
      console.log(preview);
    }
    console.log("======================================\n");

    const v = validateParsedTimetable(parsed);

    console.log("========== VALIDATION ==========");
    console.log("Subjects:\n" + v.subjects);
    console.log("Lectures:\n" + v.lectures);
    console.log("Errors:\n" + v.errors.length);
    console.log("Warnings:\n" + v.warnings.length);
    console.log("================================\n");

    if (v.warnings.length > 0) {
      console.log("Warnings:");
      for (const w of v.warnings) {
        console.log("  - " + w);
      }
    }

    if (v.errors.length > 0) {
      console.log("Errors:");
      for (const e of v.errors) {
        console.log("  - " + e);
      }
    }

    if (v.errors.length > 0) {
      throw new Error(`Validation failed with ${v.errors.length} error(s)`);
    }

    this.updateJob(jobId, { progress: 80, currentStep: "Saving timetable to database..." });

    const job = processingJobs.get(jobId);
    if (!job) return;

    const profile = await this.getProfile(job.userId);
    if (!profile?.semester_id || !profile?.division_id) {
      throw new Error("Profile missing semester or division. Please complete onboarding first.");
    }

    const persistenceService = new TimetablePersistenceService();
    await persistenceService.saveOrReplaceTimetable(
      job.userId,
      profile.division_id,
      profile.department_id,
      profile.semester_id,
      parsed,
    );

    this.updateJob(jobId, { progress: 95, currentStep: "Timetable saved successfully" });
  }

  private async getProfile(userId: string) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("department_id, semester_id, division_id")
      .eq("id", userId)
      .single();
    return data as { department_id: string; semester_id: string; division_id: string } | null;
  }

  private async processCalendar(
    jobId: string,
    aiProvider: AIProvider,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.updateJob(jobId, { progress: 30, currentStep: "Extracting calendar with AI..." });

    const processor = new CalendarProcessor();

    const { result, warnings } = await processor.process(aiProvider, buffer, mimeType);

    if (warnings.length > 0) {
      console.log(`[UploadProcessing] Warnings for job ${jobId}:`, warnings);
    }

    this.updateJob(jobId, { progress: 60, currentStep: "Saving events..." });

    const job = processingJobs.get(jobId);
    if (!job) return;

    await this.saveEvents(job.userId, result.events);
  }

  private async downloadFromStorage(
    storagePath: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const { data, error } = await supabaseAdmin.storage
      .from("attendance-files")
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Failed to download file: ${error?.message ?? "Unknown error"}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = data.type || "application/octet-stream";

    return { buffer, mimeType };
  }

  private async saveEvents(
    userId: string,
    events: Array<{ title: string; date: string; type: string; description: string }>,
  ): Promise<void> {
    await supabaseAdmin.from("holidays").delete().eq("user_id", userId);

    for (const event of events) {
      await supabaseAdmin.from("holidays").insert({
        user_id: userId,
        title: event.title,
        date: event.date,
        type: event.type,
        description: event.description || null,
      });
    }
  }
}

export const uploadProcessingService = new UploadProcessingService();
