# Attendance-Pro AI Pipeline Refactor — Step 1

## Context

The timetable processing pipeline currently depends on Sarvam Chat Completions (LLM) to parse OCR-extracted text into structured JSON. This adds latency, cost, non-determinism, and an external API dependency. The goal is to make timetable parsing completely deterministic using rule-based TypeScript, while preserving OCR (Sarvam Document Intelligence) for text extraction.

**Current flow:** Image → OCR → Chat Completions → JSON → Database  
**New flow:** Image → OCR → Markdown → Normalize → Parser (skeleton) → Database

The calendar pipeline (`extractAcademicCalendar`) still uses Chat Completions and is **not** modified in this step.

---

## Files to Create

### 1. `server/src/services/parser/types.ts` — Parser interfaces

Create the three interfaces per the spec:

```typescript
export interface ParsedSubject {
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
  facultyName?: string;
}

export interface ParsedLecture {
  day: string;
  startTime: string;
  endTime: string;
  batch: string;
  subjectCode: string;
  room?: string;
  lectureType: string;
}

export interface ParsedTimetable {
  subjects: ParsedSubject[];
  lectures: ParsedLecture[];
}
```

### 2. `server/src/services/parser/TimetableParser.ts` — Parser skeleton

```typescript
import type { ParsedTimetable } from "./types.js";

export class TimetableParser {
  parse(markdown: string): ParsedTimetable {
    console.log("[Parser] Parser initialized");
    console.log(`[Parser] Markdown length: ${markdown.length}`);
    // TODO: Implement rule-based parsing in next step
    return { subjects: [], lectures: [] };
  }
}
```

### 3. `server/src/services/parser/normalizeText.ts` — Text normalization

```typescript
export function normalizeText(raw: string): string {
  // Strip excessive whitespace, fix common OCR artifacts
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```

---

## Files to Modify

### 4. `server/src/ai/types.ts` — Add `extractText` to AIProvider

**Current interface (line 33-36):**
```typescript
export interface AIProvider {
  extractTimetable(fileBuffer: Buffer, mimeType: string): Promise<TimetableExtractionResult>;
  extractAcademicCalendar(fileBuffer: Buffer, mimeType: string): Promise<CalendarExtractionResult>;
}
```

**New interface:**
```typescript
export interface AIProvider {
  extractText(fileBuffer: Buffer, mimeType: string): Promise<string>;
  extractTimetable(fileBuffer: Buffer, mimeType: string): Promise<TimetableExtractionResult>;
  extractAcademicCalendar(fileBuffer: Buffer, mimeType: string): Promise<CalendarExtractionResult>;
}
```

**Rationale:** `extractText()` is the new OCR-only entry point. `extractTimetable()` is kept for backward compatibility (calendar pipeline still uses `extractAcademicCalendar` which internally calls chat completions).

### 5. `server/src/ai/providers/sarvam.provider.ts` — Strip Chat Completions from timetable

**Changes:**
- **Add** public `extractText()` method that wraps `extractTextFromDocument()`
- **Modify** `extractTimetable()` (lines 46-64): remove prompt building + chat completion, return `{ subjects: [], timetable: [] }` (text is obtained via `extractText()` now)
- **Keep** `extractAcademicCalendar()` unchanged (calendar pipeline)
- **Keep** all private OCR methods (`createDocJob`, `getUploadUrl`, `uploadFile`, `startDocJob`, `pollJobUntilComplete`, `downloadResult`) unchanged
- **Remove** private `callChatCompletions()` (lines 355-429)
- **Remove** private `retryWithRepairPrompt()` (lines 431-504)
- **Remove** private `parseTimetableResponse()` (lines 519-548)
- **Remove** private `stripMarkdownFences()` (lines 506-517) — only used by chat completions response handling
- **Keep** private `parseCalendarResponse()` and its helpers (`isRecord`, `getString`, `normalizeDay`, `normalizeTime`, `normalizeLectureType`, `normalizeDate`, `normalizeEventType`) — still used by calendar pipeline
- **Remove** imports: `buildTimetablePrompt` (line 9), `buildCalendarPrompt` (line 10) → only `buildCalendarPrompt` stays
- **Remove** constants: `MAX_RETRIES`, `RETRY_DELAY_MS` (lines 12-13) — not used

**New `extractTimetable()` (stub — text obtained via `extractText()`):**
```typescript
async extractTimetable(
  _fileBuffer: Buffer,
  _mimeType: string,
): Promise<TimetableExtractionResult> {
  console.log(`[SarvamProvider] extractTimetable called — use extractText() + TimetableParser instead`);
  return { subjects: [], timetable: [] };
}
```

**New public `extractText()`:**
```typescript
async extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[OCR] Starting OCR extraction | Input size: ${fileBuffer.length} bytes | MIME: ${mimeType}`);
  const text = await this.extractTextFromDocument(fileBuffer, mimeType);
  const elapsed = Date.now() - startTime;
  console.log(`[OCR] OCR extraction completed in ${elapsed}ms | Length: ${text.length} chars`);
  return text;
}
```

### 6. `server/src/ai/index.ts` — No changes needed

`SarvamProvider` still implements `AIProvider`. The new `extractText()` method is added to the provider. Exports remain the same.

### 7. `server/src/ai/processors/timetable.processor.ts` — New pipeline

**Replace the `process()` method** to accept markdown text instead of calling `aiProvider.extractTimetable()`:

**Current flow:**
```
process(aiProvider, buffer, mimeType)
  → aiProvider.extractTimetable(buffer, mimeType)  // OCR + Chat
  → validate
  → normalize
```

**New flow:**
```
process(markdown)
  → validate
  → normalize
```

Updated method signature:
```typescript
async process(
  markdown: string,
): Promise<{
  result: ProcessedTimetable;
  warnings: string[];
}>
```

The `aiProvider` and `buffer/mimeType` parameters are removed from `process()`. The caller (`upload-processing.service.ts`) will handle OCR separately and pass the markdown text.

**Imports change:**
- Remove: `AIProvider` from imports (no longer needed)
- Keep: `TimetableExtractionResult`, `ExtractedSubject`, `ExtractedTimetableEntry`
- Keep: `ValidatorService`, `ValidationResult`

### 8. `server/src/services/upload-processing.service.ts` — New pipeline orchestration

**Update `processTimetable()` (lines 119-154):**

**Current flow:**
```typescript
const processor = new TimetableProcessor();
const { result, warnings } = await processor.process(aiProvider, buffer, mimeType);
```

**New flow:**
```typescript
// Step 1: OCR
this.updateJob(jobId, { progress: 25, currentStep: "Extracting text with OCR..." });
const rawMarkdown = await aiProvider.extractText(buffer, mimeType);

// Step 2: Normalize
const markdown = normalizeText(rawMarkdown);

// Step 3: Parse (deterministic)
this.updateJob(jobId, { progress: 40, currentStep: "Parsing timetable..." });
console.log("[Parser] Parser initialized");
console.log(`[Parser] Markdown length: ${markdown.length}`);
const processor = new TimetableProcessor();
const { result, warnings } = await processor.process(markdown);
```

**Import changes:**
- Add: `import { normalizeText } from "../services/parser/normalizeText.js";`
- Keep: `TimetableProcessor` import (usage changes)
- Keep: `getAIProvider` import (still needed for `extractText()`)

### 9. `server/src/config/env.ts` — No changes

`SARVAM_MODEL` stays in env schema (still used by `extractAcademicCalendar` → `callChatCompletions` for calendar pipeline).

---

## Logging Changes

**Remove all Sarvam Chat logs from timetable flow. New logs:**

| Step | Log |
|------|-----|
| OCR start | `[OCR] Starting OCR extraction \| Input size: X bytes \| MIME: Y` |
| OCR complete | `[OCR] OCR extraction completed in Xms \| Length: Y chars` |
| Parser init | `[Parser] Parser initialized` |
| Parser input | `[Parser] Markdown length: XXXX` |
| OCR preview | `[OCR] Markdown preview (first 500 chars):\n...` (from existing `extractTextFromDocument`) |

**No Sarvam Chat logs should remain in the timetable processing path.**

---

## Verification

1. **TypeScript compilation:** Run `cd server && npx tsc --noEmit` — must pass with zero errors
2. **No unused imports:** All removed imports must not leave dangling references
3. **No Sarvam Chat in timetable path:** Grep for `callChatCompletions` in timetable-related files — should only appear in `sarvam.provider.ts` private methods (used by calendar, not timetable)
4. **Calendar pipeline intact:** `extractAcademicCalendar()` and its supporting methods remain unchanged
5. **Dev server starts:** `npm run dev` in server directory should start without errors

---

## What This Does NOT Do (Step 2+)

- Does NOT implement the actual timetable parsing logic (parser returns empty arrays)
- Does NOT modify the calendar pipeline
- Does NOT change database schema, frontend, auth, upload APIs
- Does NOT remove `SARVAM_MODEL` from env config (still used by calendar)
- Does NOT remove `callChatCompletions` entirely (still used by calendar pipeline)
