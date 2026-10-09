import { describe, expect, it } from "vitest";
import { addDays, weekDays, weekStart } from "./weeks";

describe("weeks", () => {
  it("week_start_edges: Monday start across month and year ends", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05");   // Sunday
    expect(weekStart("2026-10-05")).toBe("2026-10-05");   // Monday
    expect(weekStart("2026-11-01")).toBe("2026-10-26");   // Sunday, new month
    expect(weekStart("2027-01-01")).toBe("2026-12-28");   // Friday, new year
  });
  it("lists seven days", () => {
    expect(weekDays("2026-12-28")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });
  it("adds days in UTC without DST drift", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
});
