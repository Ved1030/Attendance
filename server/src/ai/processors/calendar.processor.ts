import type { AIProvider, CalendarExtractionResult } from "../types.js";
import { ValidatorService } from "../validator.service.js";

export interface ProcessedCalendar {
  events: Array<{
    title: string;
    date: string;
    type: string;
    description: string;
  }>;
}

export class CalendarProcessor {
  private validator: ValidatorService;

  constructor() {
    this.validator = new ValidatorService();
  }

  async process(
    aiProvider: AIProvider,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<{
    result: ProcessedCalendar;
    warnings: string[];
  }> {
    console.log("[CalendarProcessor] Starting AI extraction...");

    const raw = await aiProvider.extractAcademicCalendar(fileBuffer, mimeType);

    console.log("[CalendarProcessor] AI extraction complete. Events:", raw.events.length);

    const validation = this.validator.validateCalendar(raw);

    if (!validation.valid || !validation.data) {
      throw new Error(
        `Validation failed: ${validation.errors.join("; ")}`,
      );
    }

    return {
      result: { events: validation.data.events },
      warnings: validation.errors,
    };
  }
}
