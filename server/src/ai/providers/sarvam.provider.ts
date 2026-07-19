import JSZip from "jszip";

import { env } from "../../config/env.js";
import type {
  AIProvider,
  TimetableExtractionResult,
  CalendarExtractionResult,
} from "../types.js";
import { buildTimetablePrompt } from "../prompts/timetable.prompt.js";
import { buildCalendarPrompt } from "../prompts/calendar.prompt.js";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logRequest(method: string, url: string): void {
  console.log(`[SarvamProvider] ${method} ${url}`);
}

async function logResponse(response: Response, label: string): Promise<string> {
  const body = await response.text();
  console.log(
    `[SarvamProvider] ${label} response: ${response.status} ${response.statusText} | Body length: ${body.length}`,
  );
  if (!response.ok) {
    console.error(`[SarvamProvider] ${label} error body:`, body);
  }
  return body;
}

function buildHeaders(): Record<string, string> {
  return {
    "api-subscription-key": env.SARVAM_API_KEY,
    "Content-Type": "application/json",
  };
}

export class SarvamProvider implements AIProvider {
  async extractTimetable(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<TimetableExtractionResult> {
    const startTime = Date.now();
    console.log(`[SarvamProvider] Starting timetable extraction | Input size: ${fileBuffer.length} bytes | MIME: ${mimeType}`);

    const extractedText = await this.extractTextFromDocument(fileBuffer, mimeType);
    console.log(`[SarvamProvider] Document text extracted | Length: ${extractedText.length} chars`);

    const prompt = buildTimetablePrompt();
    const raw = await this.callChatCompletions(
      `${prompt}\n\nDocument text:\n${extractedText}`,
    );

    const elapsed = Date.now() - startTime;
    console.log(`[SarvamProvider] Timetable extraction completed in ${elapsed}ms`);
    return this.parseTimetableResponse(raw);
  }

  async extractAcademicCalendar(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<CalendarExtractionResult> {
    const startTime = Date.now();
    console.log(`[SarvamProvider] Starting calendar extraction | Input size: ${fileBuffer.length} bytes | MIME: ${mimeType}`);

    const extractedText = await this.extractTextFromDocument(fileBuffer, mimeType);
    console.log(`[SarvamProvider] Document text extracted | Length: ${extractedText.length} chars`);

    const prompt = buildCalendarPrompt();
    const raw = await this.callChatCompletions(
      `${prompt}\n\nDocument text:\n${extractedText}`,
    );

    const elapsed = Date.now() - startTime;
    console.log(`[SarvamProvider] Calendar extraction completed in ${elapsed}ms`);
    return this.parseCalendarResponse(raw);
  }

  async extractTextFromDocument(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const jobId = await this.createDocJob();
    console.log(`[SarvamProvider] Document Intelligence job created: ${jobId}`);

    const isPdf = mimeType === "application/pdf";
    let uploadBuffer: Buffer;
    let uploadFileName: string;

    if (isPdf) {
      uploadBuffer = fileBuffer;
      uploadFileName = "document.pdf";
    } else {
      const zip = new JSZip();
      zip.file("document.png", fileBuffer);
      uploadBuffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
      uploadFileName = "document.zip";
    }

    const { uploadUrl } = await this.getUploadUrl(jobId, uploadFileName);
    console.log(`[SarvamProvider] Got upload URL for ${uploadFileName}`);

    await this.uploadFile(uploadUrl, uploadBuffer);
    console.log(`[SarvamProvider] File uploaded (${uploadBuffer.length} bytes)`);

    await this.startDocJob(jobId);
    console.log(`[SarvamProvider] Document Intelligence job started`);

    await this.pollJobUntilComplete(jobId);
    console.log(`[SarvamProvider] Document Intelligence job completed`);

    const text = await this.downloadResult(jobId);
    console.log(`[SarvamProvider] Extracted markdown preview (first 500 chars):\n${text.slice(0, 500)}`);
    return text;
  }

  private async createDocJob(): Promise<string> {
    const url = `${env.SARVAM_BASE_URL}/doc-digitization/job/v1`;

    const payload = {
      job_parameters: {
        language: "en-IN",
        output_format: "md" as const,
      },
    };

    if (!payload.job_parameters.language) {
      throw new Error("createDocJob: job_parameters.language is required");
    }
    if (!payload.job_parameters.output_format) {
      throw new Error("createDocJob: job_parameters.output_format is required");
    }

    if (env.NODE_ENV === "development") {
      console.log(`[SarvamProvider] createDocJob payload:`, JSON.stringify(payload, null, 2));
    }

    logRequest("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await logResponse(response, "createDocJob");

    if (!response.ok) {
      throw new Error(
        `Failed to create Document Intelligence job: ${response.status} ${response.statusText} | Body: ${body}`,
      );
    }

    const data = JSON.parse(body) as { job_id: string };
    return data.job_id;
  }

  private async getUploadUrl(
    jobId: string,
    fileName: string,
  ): Promise<{ uploadUrl: string }> {
    const url = `${env.SARVAM_BASE_URL}/doc-digitization/job/v1/upload-files`;
    logRequest("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ job_id: jobId, files: [fileName] }),
    });

    const body = await logResponse(response, "getUploadUrl");

    if (!response.ok) {
      throw new Error(
        `Failed to get upload URL: ${response.status} ${response.statusText} | Body: ${body}`,
      );
    }

    const data = JSON.parse(body) as {
      upload_urls: Record<string, { file_url: string }>;
    };

    const urlDetails = data.upload_urls[fileName];
    if (!urlDetails) {
      throw new Error(`No upload URL returned for ${fileName}`);
    }

    return { uploadUrl: urlDetails.file_url };
  }

  private async uploadFile(
    uploadUrl: string,
    fileBuffer: Buffer,
  ): Promise<void> {
    logRequest("PUT", "<presigned-url>");

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    });

    if (response.status !== 200 && response.status !== 201) {
      const body = await response.text();
      console.error(`[SarvamProvider] Upload error: ${response.status} ${response.statusText} | Body: ${body}`);
      throw new Error(
        `Failed to upload file: ${response.status} ${response.statusText} | Body: ${body}`,
      );
    }

    console.log(`[SarvamProvider] File upload successful: ${response.status}`);
  }

  private async startDocJob(jobId: string): Promise<void> {
    const url = `${env.SARVAM_BASE_URL}/doc-digitization/job/v1/${jobId}/start`;
    logRequest("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
    });

    const body = await logResponse(response, "startDocJob");

    if (!response.ok) {
      throw new Error(
        `Failed to start Document Intelligence job: ${response.status} ${response.statusText} | Body: ${body}`,
      );
    }
  }

  private async pollJobUntilComplete(jobId: string): Promise<void> {
    const url = `${env.SARVAM_BASE_URL}/doc-digitization/job/v1/${jobId}/status`;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      logRequest("GET", url);

      const response = await fetch(url, {
        method: "GET",
        headers: buildHeaders(),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`[SarvamProvider] Poll error: ${response.status} | Body: ${body}`);
        throw new Error(
          `Failed to poll job status: ${response.status} ${response.statusText} | Body: ${body}`,
        );
      }

      const data = (await response.json()) as {
        job_state: string;
        job_details?: Array<{
          state: string;
          total_pages: number;
          pages_processed: number;
          error_message?: string;
        }>;
      };

      console.log(
        `[SarvamProvider] Job ${jobId} state: ${data.job_state}` +
          (data.job_details?.[0]
            ? ` | Pages: ${data.job_details[0].pages_processed}/${data.job_details[0].total_pages}`
            : ""),
      );

      if (data.job_state === "Completed") return;
      if (data.job_state === "Failed") {
        const errorMsg = data.job_details?.[0]?.error_message ?? "Unknown error";
        throw new Error(`Document Intelligence job failed: ${errorMsg}`);
      }
      if (data.job_state === "PartiallyCompleted") {
        console.warn(`[SarvamProvider] Job partially completed, proceeding with available output`);
        return;
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw new Error(`Document Intelligence job timed out after ${MAX_POLL_ATTEMPTS} polls`);
  }

  private async downloadResult(jobId: string): Promise<string> {
    const url = `${env.SARVAM_BASE_URL}/doc-digitization/job/v1/${jobId}/download-files`;
    logRequest("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
    });

    const body = await logResponse(response, "getDownloadLinks");

    if (!response.ok) {
      throw new Error(
        `Failed to get download URLs: ${response.status} ${response.statusText} | Body: ${body}`,
      );
    }

    const data = JSON.parse(body) as {
      download_urls: Record<string, { file_url: string }>;
    };

    const entries = Object.entries(data.download_urls);
    if (entries.length === 0) {
      throw new Error("No download URLs returned");
    }

    const [fileName, urlDetails] = entries[0]!;
    logRequest("GET", `<download:${fileName}>`);

    const downloadResponse = await fetch(urlDetails.file_url);
    if (!downloadResponse.ok) {
      const errorBody = await downloadResponse.text();
      throw new Error(
        `Failed to download result: ${downloadResponse.status} ${downloadResponse.statusText} | Body: ${errorBody}`,
      );
    }

    const zipArrayBuffer = await downloadResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipArrayBuffer);
    console.log(`[SarvamProvider] Downloaded ZIP | Files: ${Object.keys(zip.files).join(", ")}`);

    const mdFiles = Object.keys(zip.files).filter(
      (name) => name.endsWith(".md") && !zip.files[name]!.dir,
    );

    if (mdFiles.length === 0) {
      throw new Error(
        `No .md file found in ZIP. Contents: ${Object.keys(zip.files).join(", ")}`,
      );
    }

    const mdFileName = mdFiles[0]!;
    const mdContent = await zip.files[mdFileName]!.async("string");
    console.log(
      `[SarvamProvider] Extracted ${mdFileName} | Size: ${mdContent.length} chars`,
    );
    console.log(`[SarvamProvider] Markdown preview (first 500 chars):\n${mdContent.slice(0, 500)}`);

    return mdContent;
  }

  private async callChatCompletions(prompt: string): Promise<string> {
    const url = `${env.SARVAM_BASE_URL}/v1/chat/completions`;
    logRequest("POST", url);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: env.SARVAM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    const elapsed = Date.now() - startTime;
    const body = await response.text();
    console.log(
      `[SarvamProvider] Chat completions: ${response.status} ${response.statusText} | ${elapsed}ms | Body length: ${body.length}`,
    );

    if (!response.ok) {
      console.error(`[SarvamProvider] Chat completions error body:`, body);
      throw new Error(`Sarvam chat completions failed: ${response.status} ${body}`);
    }

    const data = JSON.parse(body) as Record<string, unknown>;
    const usage = data["usage"] as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    console.log(
      `[SarvamProvider] Model: ${env.SARVAM_MODEL} | ` +
        `Prompt tokens: ${usage?.prompt_tokens ?? "n/a"} | ` +
        `Completion tokens: ${usage?.completion_tokens ?? "n/a"}`,
    );

    if (env.NODE_ENV === "development") {
      console.log(`[SarvamProvider] Chat completions response:`, JSON.stringify(data, null, 2));
    }

    const choices = data["choices"];
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("No choices returned from Sarvam API");
    }

    const choice = choices[0] as Record<string, unknown>;
    const message = choice["message"] as Record<string, unknown> | undefined;

    if (!message) {
      throw new Error("No message in first choice");
    }

    const content = message["content"];
    if (typeof content !== "string" || content.length === 0) {
      console.error(`[SarvamProvider] Empty content. Full message:`, JSON.stringify(message));
      throw new Error(
        `Empty response from Sarvam API | Model: ${env.SARVAM_MODEL} | ` +
          `Tokens: ${usage?.completion_tokens ?? "n/a"}`,
      );
    }

    const output = this.stripMarkdownFences(content);
    console.log(`[SarvamProvider] Model output preview (first 500 chars):\n${output.slice(0, 500)}`);

    try {
      JSON.parse(output);
      return output;
    } catch (err) {
      console.error(`[SarvamProvider] Invalid JSON from model, retrying with repair prompt`);
      return this.retryWithRepairPrompt(output, prompt);
    }
  }

  private async retryWithRepairPrompt(brokenOutput: string, originalPrompt: string): Promise<string> {
    const repairPrompt =
      `The following JSON output is malformed. Fix it and return ONLY valid JSON.\n` +
      `Do not add explanations. Do not wrap in markdown fences.\n\n` +
      `Broken output:\n${brokenOutput}`;

    const url = `${env.SARVAM_BASE_URL}/v1/chat/completions`;
    logRequest("POST", url);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: env.SARVAM_MODEL,
        messages: [{ role: "user", content: repairPrompt }],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    const elapsed = Date.now() - startTime;
    const body = await response.text();
    console.log(
      `[SarvamProvider] Chat completions (retry): ${response.status} ${response.statusText} | ${elapsed}ms | Body length: ${body.length}`,
    );

    if (!response.ok) {
      console.error(`[SarvamProvider] Chat completions retry error body:`, body);
      throw new Error(`Sarvam chat completions retry failed: ${response.status} ${body}`);
    }

    const data = JSON.parse(body) as Record<string, unknown>;
    const usage = data["usage"] as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    console.log(
      `[SarvamProvider] Model (retry) | ` +
        `Prompt tokens: ${usage?.prompt_tokens ?? "n/a"} | ` +
        `Completion tokens: ${usage?.completion_tokens ?? "n/a"}`,
    );

    const choices = data["choices"];
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("No choices returned from Sarvam API (retry)");
    }

    const choice = choices[0] as Record<string, unknown>;
    const message = choice["message"] as Record<string, unknown> | undefined;

    if (!message) {
      throw new Error("No message in first choice (retry)");
    }

    const content = message["content"];
    if (typeof content !== "string" || content.length === 0) {
      throw new Error(`Empty response from Sarvam API on retry`);
    }

    const output = this.stripMarkdownFences(content);

    try {
      JSON.parse(output);
      return output;
    } catch {
      console.error(`[SarvamProvider] Retry output still invalid JSON:`, output.slice(0, 500));
      throw new Error(
        `Model returned invalid JSON twice. First attempt preview:\n${brokenOutput.slice(0, 300)}\n\n` +
          `Retry attempt preview:\n${output.slice(0, 300)}`,
      );
    }
  }

  private stripMarkdownFences(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  private parseTimetableResponse(raw: string): TimetableExtractionResult {
    const cleaned = this.stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const subjects = Array.isArray(parsed["subjects"])
      ? (parsed["subjects"] as unknown[])
          .filter((s): s is Record<string, unknown> => this.isRecord(s))
          .map((s) => ({
            subject_name: this.getString(s, "subject_name"),
            subject_code: this.getString(s, "subject_code"),
            faculty_name: this.getString(s, "faculty_name"),
            lecture_type: this.normalizeLectureType(this.getString(s, "lecture_type")),
          }))
      : [];

    const timetable = Array.isArray(parsed["timetable"])
      ? (parsed["timetable"] as unknown[])
          .filter((t): t is Record<string, unknown> => this.isRecord(t))
          .map((t) => ({
            subject_code: this.getString(t, "subject_code"),
            day: this.normalizeDay(this.getString(t, "day")),
            start_time: this.normalizeTime(this.getString(t, "start_time")),
            end_time: this.normalizeTime(this.getString(t, "end_time")),
            lecture_type: this.normalizeLectureType(this.getString(t, "lecture_type")),
            room: this.getString(t, "room"),
          }))
      : [];

    return { subjects, timetable };
  }

  private parseCalendarResponse(raw: string): CalendarExtractionResult {
    const cleaned = this.stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const events = Array.isArray(parsed["events"])
      ? (parsed["events"] as unknown[])
          .filter((e): e is Record<string, unknown> => this.isRecord(e))
          .map((e) => ({
            title: this.getString(e, "title"),
            date: this.normalizeDate(this.getString(e, "date")),
            type: this.normalizeEventType(this.getString(e, "type")),
            description: this.getString(e, "description"),
          }))
          .filter((e) => e.title && e.date)
      : [];

    return { events };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private getString(obj: Record<string, unknown>, key: string): string {
    const val = obj[key];
    if (typeof val === "string") return val.trim();
    if (typeof val === "number") return String(val);
    return "";
  }

  private normalizeDay(day: string): string {
    const dayMap: Record<string, string> = {
      mon: "Monday",
      monday: "Monday",
      tue: "Tuesday",
      tuesday: "Tuesday",
      wed: "Wednesday",
      wednesday: "Wednesday",
      thu: "Thursday",
      thursday: "Thursday",
      fri: "Friday",
      friday: "Friday",
      sat: "Saturday",
      saturday: "Saturday",
      sun: "Sunday",
      sunday: "Sunday",
    };
    return dayMap[day.toLowerCase()] ?? day;
  }

  private normalizeTime(time: string): string {
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return time;
    const hour = (match[1] ?? "0").padStart(2, "0");
    const min = (match[2] ?? "00").padStart(2, "0");
    return `${hour}:${min}`;
  }

  private normalizeLectureType(type: string): string {
    const upper = type.toUpperCase().trim();
    const typeMap: Record<string, string> = {
      LECTURE: "LECTURE",
      LEC: "LECTURE",
      CLASS: "LECTURE",
      LAB: "LAB",
      PRACTICAL: "LAB",
      PRAC: "LAB",
      TUTORIAL: "TUTORIAL",
      TUT: "TUTORIAL",
      WORKSHOP: "WORKSHOP",
      WS: "WORKSHOP",
    };
    return typeMap[upper] ?? "LECTURE";
  }

  private normalizeDate(date: string): string {
    const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return date;
    const year = match[1] ?? "2025";
    const month = (match[2] ?? "01").padStart(2, "0");
    const day = (match[3] ?? "01").padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private normalizeEventType(type: string): string {
    const upper = type.toUpperCase().trim();
    const validTypes = [
      "HOLIDAY",
      "EXAM",
      "MID_SEMESTER",
      "END_SEMESTER",
      "FESTIVAL",
      "VACATION",
      "SUBMISSION",
      "ACADEMIC_EVENT",
    ];
    if (validTypes.includes(upper)) return upper;
    if (upper.includes("MID")) return "MID_SEMESTER";
    if (upper.includes("END") || upper.includes("FINAL")) return "END_SEMESTER";
    if (upper.includes("EXAM")) return "EXAM";
    if (upper.includes("VACATION") || upper.includes("BREAK")) return "VACATION";
    if (upper.includes("SUBMISSION") || upper.includes("DEADLINE")) return "SUBMISSION";
    if (upper.includes("FESTIVAL") || upper.includes("CULTURAL")) return "FESTIVAL";
    return "ACADEMIC_EVENT";
  }
}
