import type { AIProvider } from "./types.js";
import { SarvamProvider } from "./providers/sarvam.provider.js";

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new SarvamProvider();
  }
  return providerInstance;
}

export type {
  AIProvider,
  ExtractedSubject,
  ExtractedTimetableEntry,
  ExtractedEvent,
  TimetableExtractionResult,
  CalendarExtractionResult,
  DocumentType,
  ProcessingStatus,
  ProcessingJob,
} from "./types.js";
