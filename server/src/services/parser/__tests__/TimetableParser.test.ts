import { describe, it, expect } from "vitest";
import { TimetableParser } from "../TimetableParser.js";

function wrapTable(tbody: string[]): string {
  return `
    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>Monday</th>
          <th>Tuesday</th>
          <th>Wednesday</th>
          <th>Thursday</th>
          <th>Friday</th>
          <th>Saturday</th>
        </tr>
      </thead>
      <tbody>
        ${tbody.join("")}
      </tbody>
    </table>
  `;
}

function simpleRow(
  time: string,
  cells: string[],
): string {
  const td = cells
    .map((c) => `<td>${c}</td>`)
    .join("");
  return `<tr><td>${time}</td>${td}</tr>`;
}

function rowspanRow(
  time: string,
  cells: Array<{ content: string; rowspan?: number }>,
): string {
  const td = cells
    .map((c) => {
      const rs = c.rowspan && c.rowspan > 1
        ? ` rowspan="${c.rowspan}"`
        : "";
      return `<td${rs}>${c.content}</td>`;
    })
    .join("");
  return `<tr><td>${time}</td>${td}</tr>`;
}

describe("TimetableParser", () => {
  const parser = new TimetableParser();

  describe("basic parsing", () => {
    it("parses a simple timetable with all days", () => {
      const html = wrapTable([
        simpleRow("08:00 - 09:00", [
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "I1-1:CN(AP)(305)",
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "",
        ]),
        simpleRow("09:00 - 10:00", [
          "I1-1:CN(AP)(305)",
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "I1-1:CN(AP)(305)",
          "I2-1:SA(V)(L3)",
          "",
        ]),
      ]);

      const result = parser.parse(html);

      expect(result.subjects).toHaveLength(3);
      expect(result.lectures).toHaveLength(10);

      const codes = result.subjects.map((s) => s.subjectCode).sort();
      expect(codes).toEqual(["CN", "DevOps", "SA"]);

      expect(result.lectures[0]).toEqual({
        day: "Monday",
        startTime: "08:00",
        endTime: "09:00",
        batch: "I2-1",
        subjectCode: "SA",
        room: "L3",
        lectureType: "LAB",
      });
    });

    it("returns empty for input with no HTML table", () => {
      const result = parser.parse("Just some plain text, no table.");
      expect(result.subjects).toHaveLength(0);
      expect(result.lectures).toHaveLength(0);
    });

    it("returns empty for empty input", () => {
      const result = parser.parse("");
      expect(result.subjects).toHaveLength(0);
      expect(result.lectures).toHaveLength(0);
    });
  });

  describe("rowspan handling", () => {
    it("inherits rowspan cells into the next row", () => {
      const html = wrapTable([
        rowspanRow("08:00 - 09:00", [
          { content: "I2-1:SA(V)(L3)", rowspan: 2 },
          { content: "I2-2:DevOps(AJ)(L6)" },
          { content: "I1-1:CN(AP)(305)" },
          { content: "I2-1:SA(V)(L3)" },
          { content: "I2-2:DevOps(AJ)(L6)" },
          { content: "" },
        ]),
        simpleRow("09:00 - 10:00", [
          "I1-1:CN(AP)(305)",
          "I2-2:DevOps(AJ)(L6)",
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "",
        ]),
      ]);

      const result = parser.parse(html);

      const mondayLectures = result.lectures.filter(
        (l) => l.day === "Monday",
      );
      expect(mondayLectures).toHaveLength(2);
      expect(mondayLectures[0]!.subjectCode).toBe("SA");
      expect(mondayLectures[0]!.startTime).toBe("08:00");
      expect(mondayLectures[1]!.subjectCode).toBe("SA");
      expect(mondayLectures[1]!.startTime).toBe("09:00");
    });

    it("handles rowspan spanning more than 2 rows", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th><th>Tuesday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td rowspan="3">I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
            </tr>
            <tr>
              <td>09:00 - 10:00</td>
              <td>I1-1:CN(AP)(305)</td>
            </tr>
            <tr>
              <td>10:00 - 11:00</td>
              <td>I2-1:SA(V)(L3)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);

      const mondayLectures = result.lectures.filter(
        (l) => l.day === "Monday",
      );
      expect(mondayLectures).toHaveLength(3);
      for (const lec of mondayLectures) {
        expect(lec.subjectCode).toBe("SA");
        expect(lec.room).toBe("L3");
        expect(lec.lectureType).toBe("LAB");
      }
      expect(mondayLectures[0]!.startTime).toBe("08:00");
      expect(mondayLectures[1]!.startTime).toBe("09:00");
      expect(mondayLectures[2]!.startTime).toBe("10:00");
    });
  });

  describe("multiple batches per cell", () => {
    it("splits entries separated by <br>", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)(L3)<br>I2-2:DevOps(AJ)(L6)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);

      expect(result.lectures).toHaveLength(2);
      expect(result.lectures[0]!.batch).toBe("I2-1");
      expect(result.lectures[0]!.subjectCode).toBe("SA");
      expect(result.lectures[1]!.batch).toBe("I2-2");
      expect(result.lectures[1]!.subjectCode).toBe("DevOps");
    });

    it("handles <br/> and <br /> variants", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)(L3)<br/>I2-2:DevOps(AJ)(L6)<br />I1-1:CN(AP)(305)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      expect(result.subjects).toHaveLength(3);
    });

    it("handles three or more entries in one cell", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)(L3)<br>I2-2:DevOps(AJ)(L6)<br>I3-1:OS(RK)(L10)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      const batches = result.lectures.map((l) => l.batch).sort();
      expect(batches).toEqual(["I2-1", "I2-2", "I3-1"]);
    });
  });

  describe("blank and skip cells", () => {
    it("skips empty cells", () => {
      const html = wrapTable([
        simpleRow("08:00 - 09:00", [
          "I2-1:SA(V)(L3)",
          "",
          "I1-1:CN(AP)(305)",
          "",
          "",
          "",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(2);
    });

    it("skips BREAK cells", () => {
      const html = wrapTable([
        simpleRow("12:00 - 13:00", [
          "BREAK",
          "BREAK",
          "BREAK",
          "BREAK",
          "BREAK",
          "BREAK",
        ]),
        simpleRow("13:00 - 14:00", [
          "I2-1:SA(V)(L3)",
          "",
          "",
          "",
          "",
          "",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(1);
      expect(result.lectures[0]!.subjectCode).toBe("SA");
    });

    it("skips LUNCH cells", () => {
      const html = wrapTable([
        simpleRow("12:00 - 13:00", [
          "LUNCH",
          "LUNCH",
          "LUNCH",
          "LUNCH",
          "LUNCH",
          "LUNCH",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(0);
    });

    it("skips RECESS and FREE cells", () => {
      const html = wrapTable([
        simpleRow("12:00 - 13:00", [
          "RECESS",
          "FREE",
          "FREE HOUR",
          "-",
          "–",
          "—",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(0);
    });

    it("skips EMPTY cells", () => {
      const html = wrapTable([
        simpleRow("12:00 - 13:00", [
          "EMPTY",
          "EMPTY",
          "EMPTY",
          "EMPTY",
          "EMPTY",
          "EMPTY",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(0);
    });
  });

  describe("duplicate subjects", () => {
    it("collects one unique subject even if it appears many times", () => {
      const html = wrapTable([
        simpleRow("08:00 - 09:00", [
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "",
        ]),
        simpleRow("09:00 - 10:00", [
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "I2-1:SA(V)(L3)",
          "",
        ]),
      ]);

      const result = parser.parse(html);

      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0]!.subjectCode).toBe("SA");
      expect(result.lectures).toHaveLength(10);
    });

    it("tracks different subjects correctly", () => {
      const html = wrapTable([
        simpleRow("08:00 - 09:00", [
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "I1-1:CN(AP)(305)",
          "I2-1:SA(V)(L3)",
          "I2-2:DevOps(AJ)(L6)",
          "I1-1:CN(AP)(305)",
        ]),
      ]);

      const result = parser.parse(html);
      expect(result.subjects).toHaveLength(3);
      expect(result.lectures).toHaveLength(6);
    });
  });

  describe("malformed cells", () => {
    it("skips malformed entries without crashing", () => {
      const html = wrapTable([
        simpleRow("08:00 - 09:00", [
          "RANDOM TEXT",
          "I2-1:SA(V)(L3)",
          ":missing batch",
          "I2-1:(V)(L3)",
          "I2-1:SA()",
          "I2-1:SA(V)",
          "I2-1:SA(V)(L3)",
        ]),
      ]);

      const result = parser.parse(html);
      // "I2-1:SA(V)(L3)" parses fine, "I2-1:SA(V)" has no room (optional)
      // "RANDOM TEXT", ":missing batch", "I2-1:(V)(L3)", "I2-1:SA()" are malformed
      expect(result.lectures.length).toBeGreaterThanOrEqual(2);
    });

    it("handles entry with no room (optional room)", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(1);
      expect(result.lectures[0]!.subjectCode).toBe("SA");
      expect(result.lectures[0]!.lectureType).toBe("LECTURE");
    });
  });

  describe("time parsing", () => {
    it("parses various time formats", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>8:00 - 9:00</td>
              <td>I2-1:SA(V)(L3)</td>
            </tr>
            <tr>
              <td>14:30 – 15:30</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
            </tr>
            <tr>
              <td>09:00—10:00</td>
              <td>I1-1:CN(AP)(305)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      expect(result.lectures[0]!.startTime).toBe("8:00");
      expect(result.lectures[0]!.endTime).toBe("9:00");
      expect(result.lectures[1]!.startTime).toBe("14:30");
      expect(result.lectures[1]!.endTime).toBe("15:30");
      expect(result.lectures[2]!.startTime).toBe("09:00");
      expect(result.lectures[2]!.endTime).toBe("10:00");
    });

    it("skips rows without valid time", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>No time here</td>
              <td>I2-1:SA(V)(L3)</td>
            </tr>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(1);
      expect(result.lectures[0]!.subjectCode).toBe("DevOps");
    });
  });

  describe("lecture type detection", () => {
    it("returns LAB when room starts with L", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)(L3)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures[0]!.lectureType).toBe("LAB");
    });

    it("returns LECTURE when room does not start with L", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I1-1:CN(AP)(305)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures[0]!.lectureType).toBe("LECTURE");
    });

    it("returns LECTURE when no room", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)</td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures[0]!.lectureType).toBe("LECTURE");
    });
  });

  describe("markdown wrapped table", () => {
    it("extracts HTML table from markdown text", () => {
      const markdown = `
# Timetable

Here is the class schedule:

<table>
  <thead>
    <tr><th>Period</th><th>Monday</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>08:00 - 09:00</td>
      <td>I2-1:SA(V)(L3)</td>
    </tr>
  </tbody>
</table>

Some notes below the table.
      `;

      const result = parser.parse(markdown);
      expect(result.lectures).toHaveLength(1);
      expect(result.subjects).toHaveLength(1);
    });
  });

  describe("table without thead/tbody", () => {
    it("handles table with only tr elements", () => {
      const html = `
        <table>
          <tr><th>Period</th><th>Monday</th><th>Tuesday</th></tr>
          <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
        </table>
      `;

      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(2);
    });
  });

  describe("comprehensive scenario", () => {
    it("handles a realistic timetable with all edge cases", () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
              <th>Saturday</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td>I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td>I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td></td>
            </tr>
            <tr>
              <td>09:00 - 10:00</td>
              <td>I1-1:CN(AP)(305)</td>
              <td rowspan="2">I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td>I2-1:SA(V)(L3)</td>
              <td></td>
            </tr>
            <tr>
              <td>10:00 - 11:00</td>
              <td>I2-1:SA(V)(L3)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td></td>
            </tr>
            <tr>
              <td>11:00 - 12:00</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td>I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td></td>
            </tr>
            <tr>
              <td>12:00 - 13:00</td>
              <td>LUNCH</td>
              <td>LUNCH</td>
              <td>LUNCH</td>
              <td>LUNCH</td>
              <td>LUNCH</td>
              <td>LUNCH</td>
            </tr>
            <tr>
              <td>13:00 - 14:00</td>
              <td>I2-1:SA(V)(L3)<br>I2-2:DevOps(AJ)(L6)</td>
              <td>I1-1:CN(AP)(305)</td>
              <td></td>
              <td>I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `;

      const result = parser.parse(html);

      expect(result.subjects).toHaveLength(3);
      expect(result.lectures.length).toBeGreaterThanOrEqual(15);

      const mondayLectures = result.lectures.filter(
        (l) => l.day === "Monday",
      );
      expect(mondayLectures.length).toBeGreaterThanOrEqual(5);

      const lunchLectures = result.lectures.filter(
        (l) => l.subjectCode === "LUNCH",
      );
      expect(lunchLectures).toHaveLength(0);

      const saLectures = result.lectures.filter(
        (l) => l.subjectCode === "SA",
      );
      expect(saLectures.length).toBeGreaterThanOrEqual(5);

      const labLectures = result.lectures.filter(
        (l) => l.lectureType === "LAB",
      );
      expect(labLectures.length).toBeGreaterThan(0);

      const lectureTypeLectures = result.lectures.filter(
        (l) => l.lectureType === "LECTURE",
      );
      expect(lectureTypeLectures.length).toBeGreaterThan(0);
    });
  });

  describe("Saturday header", () => {
    it("normalizes S to Saturday in headers", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>S</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td><td></td><td></td><td></td><td></td><td>I2-2:DevOps(AJ)(L6)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      const saturday = result.lectures.find((l) => l.day === "Saturday");
      expect(saturday).toBeDefined();
      expect(saturday!.subjectCode).toBe("DevOps");
    });

    it("normalizes short day abbreviations", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>M</th><th>T</th><th>W</th><th>Th</th><th>F</th><th>Sa</th><th>Su</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td><td>I2-2:DevOps(AJ)(L6)</td><td>I1-1:CN(AP)(305)</td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures.find((l) => l.day === "Monday")).toBeDefined();
      expect(result.lectures.find((l) => l.day === "Tuesday")).toBeDefined();
      expect(result.lectures.find((l) => l.day === "Wednesday")).toBeDefined();
    });
  });

  describe("afternoon times", () => {
    it("parses afternoon 12-hour format times correctly", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>12:00 - 01:00</td><td>I2-1:SA(V)(L3)</td></tr>
            <tr><td>01:00 - 02:00</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
            <tr><td>02:00 - 03:00</td><td>I1-1:CN(AP)(305)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      expect(result.lectures[0]!.startTime).toBe("12:00");
      expect(result.lectures[0]!.endTime).toBe("13:00");
      expect(result.lectures[1]!.startTime).toBe("13:00");
      expect(result.lectures[1]!.endTime).toBe("14:00");
      expect(result.lectures[2]!.startTime).toBe("14:00");
      expect(result.lectures[2]!.endTime).toBe("15:00");
    });

    it("handles mixed morning and afternoon times", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td></tr>
            <tr><td>09:00 - 10:00</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
            <tr><td>10:00 - 11:00</td><td>I1-1:CN(AP)(305)</td></tr>
            <tr><td>11:00 - 12:00</td><td>I2-1:SA(V)(L3)</td></tr>
            <tr><td>12:00 - 01:00</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
            <tr><td>01:00 - 02:00</td><td>I1-1:CN(AP)(305)</td></tr>
            <tr><td>02:00 - 03:00</td><td>I2-1:SA(V)(L3)</td></tr>
            <tr><td>03:00 - 04:00</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(8);
      const times = result.lectures.map((l) => `${l.startTime}-${l.endTime}`);
      expect(times).toEqual([
        "08:00-09:00",
        "09:00-10:00",
        "10:00-11:00",
        "11:00-12:00",
        "12:00-13:00",
        "13:00-14:00",
        "14:00-15:00",
        "15:00-16:00",
      ]);
    });
  });

  describe("merged project cells", () => {
    it("skips long project description cells", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>Innovative Product Development</td></tr>
            <tr><td>09:00 - 10:00</td><td>Research/Project Work</td></tr>
            <tr><td>10:00 - 11:00</td><td>Data Processing and Optimization with Generative AI</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(0);
    });
  });

  describe("entries without batch", () => {
    it("parses cell entries that have no batch prefix", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>SA(SC)(66)</td></tr>
            <tr><td>09:00 - 10:00</td><td>AI(PS)(65)</td></tr>
            <tr><td>10:00 - 11:00</td><td>DWM(VS)(64)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      expect(result.lectures[0]!.subjectCode).toBe("SA");
      expect(result.lectures[0]!.room).toBe("66");
      expect(result.lectures[1]!.subjectCode).toBe("AI");
      expect(result.lectures[2]!.subjectCode).toBe("DWM");
    });

    it("handles mixed entries with and without batch", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)<br>COI(AH)(27)<br>CN(AP)(66)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      const codes = result.lectures.map((l) => l.subjectCode).sort();
      expect(codes).toEqual(["CN", "COI", "SA"]);
    });

    it("collects subjects from batchless entries", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>SA(SC)(66)</td></tr>
            <tr><td>09:00 - 10:00</td><td>AI(PS)(65)</td></tr>
            <tr><td>10:00 - 11:00</td><td>DWM(VS)(64)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.subjects).toHaveLength(3);
      const codes = result.subjects.map((s) => s.subjectCode).sort();
      expect(codes).toEqual(["AI", "DWM", "SA"]);
    });
  });

  describe("project rows", () => {
    it("skips rows with project-related long text", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td></tr>
            <tr><td>09:00 - 10:00</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
            <tr><td>10:00 - 11:00</td><td>Student Research Project Phase II</td></tr>
            <tr><td>11:00 - 12:00</td><td>I1-1:CN(AP)(305)</td></tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      const codes = result.lectures.map((l) => l.subjectCode);
      expect(codes).not.toContain("Student");
      expect(codes).toHaveLength(3);
    });
  });

  describe("mixed rowspan + colspan", () => {
    it("handles cells with both rowspan and colspan", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>08:00 - 09:00</td>
              <td colspan="2" rowspan="2">I2-1:SA(V)(L3)</td>
              <td>I2-2:DevOps(AJ)(L6)</td>
            </tr>
            <tr>
              <td>09:00 - 10:00</td>
              <td>I1-1:CN(AP)(305)</td>
            </tr>
          </tbody>
        </table>
      `;
      const result = parser.parse(html);
      const monday = result.lectures.filter((l) => l.day === "Monday");
      expect(monday).toHaveLength(2);
      expect(monday[0]!.startTime).toBe("08:00");
      expect(monday[1]!.startTime).toBe("09:00");

      const tuesday = result.lectures.filter((l) => l.day === "Tuesday");
      expect(tuesday).toHaveLength(2);
    });
  });

  describe("multiple OCR outputs", () => {
    it("handles table embedded in markdown with extra whitespace", () => {
      const markdown = `
        Here is your timetable:

        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th><th>Tuesday</th></tr>
          </thead>
          <tbody>
            <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td><td>I2-2:DevOps(AJ)(L6)</td></tr>
            <tr><td>09:00 - 10:00</td><td>I1-1:CN(AP)(305)</td><td>I2-1:SA(V)(L3)</td></tr>
          </tbody>
        </table>

        End of timetable.
      `;
      const result = parser.parse(markdown);
      expect(result.lectures).toHaveLength(4);
      expect(result.subjects).toHaveLength(3);
    });

    it("handles table without explicit thead/tbody structure", () => {
      const html = `
        <table>
          <tr><th>Period</th><th>Mon</th><th>Tue</th><th>Wed</th></tr>
          <tr><td>08:00 - 09:00</td><td>I2-1:SA(V)(L3)</td><td></td><td></td></tr>
          <tr><td>09:00 - 10:00</td><td></td><td>I2-2:DevOps(AJ)(L6)</td><td></td></tr>
          <tr><td>10:00 - 11:00</td><td></td><td></td><td>I1-1:CN(AP)(305)</td></tr>
        </table>
      `;
      const result = parser.parse(html);
      expect(result.lectures).toHaveLength(3);
      expect(result.lectures[0]!.day).toBe("Monday");
      expect(result.lectures[1]!.day).toBe("Tuesday");
      expect(result.lectures[2]!.day).toBe("Wednesday");
    });

    it("skips plain text without any table", () => {
      const result = parser.parse("Just some random notes about the schedule.");
      expect(result.lectures).toHaveLength(0);
      expect(result.subjects).toHaveLength(0);
    });
  });
});
