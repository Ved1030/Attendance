import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { ParsedTimetable, ParsedSubject, ParsedLecture } from "./types.js";

const CELL_ENTRY_RE = /^([^:]+):([^(]+)\(([^)]+)\)(?:\(([^)]+)\))?$/;
const CELL_ENTRY_NO_BATCH_RE = /^([^(]+)\(([^)]+)\)(?:\(([^)]+)\))?$/;
const TIME_RANGE_RE = /(\d{1,2}:\d{2})\s*?[-–—]\s*?(\d{1,2}:\d{2})/;
const SKIP_RE = /^(BREAK|LUNCH|EMPTY|RECESS|FREE|FREE\s*?HOUR|-|–|—)$/i;
const PROJECT_RE = /^(Innovative|Research|Data Processing|Project|Project\s*?Work|Development|Student\s*?Research|Applied|Major\s*?Project|Minor\s*?Project)/i;
const PROJECT_THRESHOLD = 20;

const DAY_ALIAS: Record<string, string> = {
  S: "Saturday",
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  Th: "Thursday",
  F: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};

function normalizeDay(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (DAY_ALIAS[trimmed]) return DAY_ALIAS[trimmed];
  const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (DAY_ALIAS[cap]) return DAY_ALIAS[cap];
  return trimmed;
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (h === undefined || m === undefined) return t;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function resolveTime(start: string, end: string, previousStartHour?: number): { startTime: string; endTime: string } {
  const rawStart = normalizeTime(start);
  const rawEnd = normalizeTime(end);
  const s = rawStart.split(":").map(Number);
  const e = rawEnd.split(":").map(Number);

  let sh = s[0]!;
  let eh = e[0]!;

  if (previousStartHour !== undefined) {
    if (sh < previousStartHour && sh >= 1 && sh <= 11) {
      sh += 12;
    }
  }

  if (eh < sh && eh >= 1 && eh <= 11) {
    eh += 12;
  } else if (eh < sh) {
    eh += 24;
  }

  return {
    startTime: `${String(sh).padStart(2, "0")}:${String(s[1]!).padStart(2, "0")}`,
    endTime: `${String(eh).padStart(2, "0")}:${String(e[1]!).padStart(2, "0")}`,
  };
}

function getDayFromHeaders(headers: string[], colIdx: number): string {
  return headers[colIdx] ?? "";
}

function isLectureLike(content: string): boolean {
  return CELL_ENTRY_RE.test(content) || CELL_ENTRY_NO_BATCH_RE.test(content);
}

function isProjectCell(content: string): boolean {
  return content.length >= PROJECT_THRESHOLD || PROJECT_RE.test(content);
}

interface ParsedCell {
  batch: string;
  subjectCode: string;
  subjectName: string;
  facultyCode: string;
  room: string;
}

export class TimetableParser {
  parse(markdown: string): ParsedTimetable {
    console.log("[Parser] Reading table...");

    const tableHtml = this.extractHtmlTable(markdown);
    if (!tableHtml) {
      console.log("[Parser] No HTML table found in input");
      return { subjects: [], lectures: [] };
    }

    const $ = cheerio.load(tableHtml);

    const headers = this.readHeaders($);
    if (headers.length < 2) {
      console.log("[Parser] Insufficient headers found");
      return { subjects: [], lectures: [] };
    }

    const normalizedHeaders = headers.map(normalizeDay);
    console.log(`[Parser] Days detected: ${normalizedHeaders.slice(1).join(", ")}`);

    const grid = this.buildGrid($, headers.length);
    const subjectMap = new Map<string, ParsedSubject>();
    const lectures: ParsedLecture[] = [];
    let previousStartHour: number | undefined;

    for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
      const row = grid[rowIdx];
      if (!row) continue;

      const timeCell = row[0] ?? "";
      const timeMatch = timeCell.match(TIME_RANGE_RE);
      if (!timeMatch) continue;

      const { startTime, endTime } = resolveTime(timeMatch[1] ?? "", timeMatch[2] ?? "", previousStartHour);
      previousStartHour = parseInt(startTime.split(":")[0] ?? "0", 10);

      for (let colIdx = 1; colIdx < normalizedHeaders.length; colIdx++) {
        const cellContent = row[colIdx] ?? "";
        if (!cellContent) continue;

        const trimmedContent = cellContent.trim();
        if (!trimmedContent || SKIP_RE.test(trimmedContent)) continue;

        if (isProjectCell(trimmedContent)) {
          continue;
        }

        if (!isLectureLike(trimmedContent)) {
          continue;
        }

        const entries = cellContent.split("\n");
        for (const entry of entries) {
          const trimmed = entry.trim();
          if (!trimmed || SKIP_RE.test(trimmed)) continue;

          const dayName = getDayFromHeaders(normalizedHeaders, colIdx);

          let parsed: ParsedCell | null = this.parseCellEntry(trimmed);
          if (!parsed) {
            parsed = this.parseCellEntryNoBatch(trimmed);
          }

          if (!parsed) {
            continue;
          }

          const existing = subjectMap.get(parsed.subjectCode);
          if (existing) {
            if (parsed.facultyCode && !existing.facultyCode) {
              existing.facultyCode = parsed.facultyCode;
            }
            if (parsed.subjectName && parsed.subjectName !== parsed.subjectCode && !existing.subjectName) {
              existing.subjectName = parsed.subjectName;
            }
          }
          if (!existing) {
            subjectMap.set(parsed.subjectCode, {
              subjectCode: parsed.subjectCode,
              subjectName: parsed.subjectName || parsed.subjectCode,
              facultyCode: parsed.facultyCode,
            });
          }

          const lecture: ParsedLecture = {
            day: dayName,
            startTime,
            endTime,
            batch: parsed.batch,
            subjectCode: parsed.subjectCode,
            lectureType: this.determineLectureType(parsed.room),
          };

          if (parsed.room) {
            lecture.room = parsed.room;
          }
          lectures.push(lecture);
        }
      }
    }

    console.log(`[Parser] Subjects: ${subjectMap.size}`);
    console.log(`[Parser] Lectures: ${lectures.length}`);
    console.log("[Parser] Parsing completed.");

    return {
      subjects: Array.from(subjectMap.values()),
      lectures,
    };
  }

  private extractHtmlTable(input: string): string | null {
    const match = input.match(/<table[\s\S]*?<\/table>/i);
    return match ? match[0] : null;
  }

  private readHeaders($: CheerioAPI): string[] {
    let headerCells = $("thead tr th").toArray();
    if (headerCells.length === 0) {
      headerCells = $("thead tr td").toArray();
    }
    if (headerCells.length === 0) {
      const firstRow = $("tr").first();
      headerCells = firstRow.find("th").toArray();
      if (headerCells.length === 0) {
        headerCells = firstRow.find("td").toArray();
      }
    }
    return headerCells.map((h) => $(h).text().trim());
  }

  private buildGrid($: CheerioAPI, totalCols: number): string[][] {
    let dataRows = $("tbody tr").toArray();
    if (dataRows.length === 0) {
      const allRows = $("tr").toArray();
      dataRows = allRows.slice(1);
    }
    return this.buildGridFromRows($, dataRows, totalCols);
  }

  private buildGridFromRows(
    $: CheerioAPI,
    rows: AnyNode[],
    totalCols: number,
  ): string[][] {
    const grid: string[][] = [];

    const endRow: number[] = new Array(totalCols).fill(-1);
    const spanContent: string[] = new Array(totalCols).fill("");

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row) continue;
      const cells = $(row).find("td, th").toArray();

      const gridRow: string[] = new Array(totalCols).fill("");

      for (let col = 0; col < totalCols; col++) {
        if ((endRow[col] ?? -1) >= rowIdx) {
          gridRow[col] = spanContent[col] ?? "";
        }
      }

      let gridCol = 0;
      for (const cell of cells) {
        while (
          gridCol < totalCols &&
          (endRow[gridCol] ?? -1) >= rowIdx
        ) {
          gridCol++;
        }

        if (gridCol >= totalCols) break;

        const rowspan =
          parseInt($(cell).attr("rowspan") ?? "1", 10) || 1;
        const colspan =
          parseInt($(cell).attr("colspan") ?? "1", 10) || 1;
        const content = this.getCellContent($, cell);

        for (let c = 0; c < colspan && gridCol + c < totalCols; c++) {
          gridRow[gridCol + c] = content;

          if (rowspan > 1) {
            endRow[gridCol + c] = rowIdx + rowspan - 1;
            spanContent[gridCol + c] = content;
          } else {
            endRow[gridCol + c] = -1;
            spanContent[gridCol + c] = "";
          }
        }

        gridCol += colspan;
      }

      grid.push(gridRow);
    }

    return grid;
  }

  private getCellContent($: CheerioAPI, cell: AnyNode): string {
    const html = $(cell).html() ?? "";
    const entries = html
      .split(/<br\s*\/?>/gi)
      .map((part) => part.replace(/<[^>]*>/g, "").trim())
      .filter((part) => part.length > 0);
    return entries.join("\n");
  }

  private parseCellEntry(entry: string): ParsedCell | null {
    const match = CELL_ENTRY_RE.exec(entry);
    if (!match) return null;

    const batch = (match[1] ?? "").trim();
    const subjectCode = (match[2] ?? "").trim();
    const facultyCode = (match[3] ?? "").trim();
    const room = (match[4] ?? "").trim();

    if (!batch || !subjectCode) return null;

    return { batch, subjectCode, subjectName: subjectCode, facultyCode: facultyCode || "", room: room || "" };
  }

  private parseCellEntryNoBatch(entry: string): ParsedCell | null {
    const match = CELL_ENTRY_NO_BATCH_RE.exec(entry);
    if (!match) return null;

    const subjectCode = (match[1] ?? "").trim();
    const facultyCode = (match[2] ?? "").trim();
    const room = (match[3] ?? "").trim();

    if (!subjectCode) return null;

    return { batch: "", subjectCode, subjectName: subjectCode, facultyCode: facultyCode || "", room: room || "" };
  }

  private determineLectureType(room: string): string {
    if (!room) return "LECTURE";
    return /^L/i.test(room) ? "LAB" : "LECTURE";
  }
}
