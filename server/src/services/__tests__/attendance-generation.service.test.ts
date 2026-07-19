import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceGenerationService } from "../attendance-generation.service.js";

function mockSupabase(data: unknown, error: unknown = null) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
}

vi.mock("../../config/supabase.js", () => ({
  supabaseAdmin: mockSupabase({ success: true, sessionsCreated: 10, sessionsSkipped: 3, holidaysSkipped: 2 }),
}));

import { supabaseAdmin } from "../../config/supabase.js";

const mockRpc = vi.mocked(supabaseAdmin.rpc);

describe("AttendanceGenerationService", () => {
  let service: AttendanceGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AttendanceGenerationService();
  });

  describe("generateSessions", () => {
    it("generates sessions successfully", async () => {
      const holidays = [
        { date: "2025-08-15", type: "HOLIDAY" },
        { date: "2025-12-25", type: "FESTIVAL" },
      ];

      mockRpc.mockResolvedValue({
        data: { success: true, sessionsCreated: 10, sessionsSkipped: 3, holidaysSkipped: 2 },
        error: null,
      } as never);

      // Mock holidays query
      const mockHolidayQuery = vi.fn().mockResolvedValue({
        data: holidays,
        error: null,
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: holidays, error: null }),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn(),
        rpc: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as never);

      const result = await service.generateSessions(
        "user-1",
        "div-1",
        "2025-08-01",
        "2025-12-31",
      );

      expect(result.success).toBe(true);
      expect(result.sessionsCreated).toBe(10);
      expect(result.sessionsSkipped).toBe(3);
      expect(result.holidaysSkipped).toBe(2);
    });

    it("throws on rpc error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "division_id violates foreign key constraint" },
      } as never);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn(),
        rpc: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as never);

      await expect(
        service.generateSessions("user-1", "bad-div", "2025-08-01", "2025-12-31"),
      ).rejects.toThrow("Failed to generate attendance sessions");
    });

    it("handles empty holiday list gracefully", async () => {
      mockRpc.mockResolvedValue({
        data: { success: true, sessionsCreated: 10, sessionsSkipped: 0, holidaysSkipped: 0 },
        error: null,
      } as never);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn(),
        rpc: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn(),
      } as never);

      const result = await service.generateSessions(
        "user-1",
        "div-1",
        "2025-08-01",
        "2025-08-31",
      );

      expect(result.sessionsCreated).toBe(10);
      expect(result.holidaysSkipped).toBe(0);
    });
  });

  describe("getGeneratedSessions", () => {
    it("returns sessions for a division", async () => {
      const mockSessions = [
        { id: "1", date: "2025-08-04", day_of_week: 1, start_time: "08:00", end_time: "09:00", status: "scheduled" },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
        limit: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as never);

      const sessions = await service.getGeneratedSessions("div-1");

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.id).toBe("1");
    });

    it("filters by date range", async () => {
      const mockSessions = [{ id: "2", date: "2025-08-11" }];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
        limit: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as never);

      const sessions = await service.getGeneratedSessions("div-1", "2025-08-01", "2025-08-31");

      expect(sessions).toHaveLength(1);
      expect(mockChain.gte).toHaveBeenCalledWith("date", "2025-08-01");
      expect(mockChain.lte).toHaveBeenCalledWith("date", "2025-08-31");
    });
  });

  describe("getUpcomingSessions", () => {
    it("returns limited upcoming sessions", async () => {
      const mockSessions = Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 1),
        date: "2025-08-04",
        status: "scheduled",
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
        limit: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as never);

      const sessions = await service.getUpcomingSessions("div-1", 5);

      expect(sessions).toHaveLength(5);
    });
  });

  describe("getGenerationLogs", () => {
    it("returns generation logs", async () => {
      const mockLogs = [
        { id: "1", division_id: "div-1", sessions_created: 10, generated_at: "2025-08-01T00:00:00Z" },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
        limit: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as never);

      const logs = await service.getGenerationLogs("div-1");

      expect(logs).toHaveLength(1);
      expect(logs[0].sessions_created).toBe(10);
    });
  });
});
