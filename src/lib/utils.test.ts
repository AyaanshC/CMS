import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMoney,
  formatDateTime,
  formatShortDate,
  isOverdue,
} from "./utils";

describe("dates used in project and finance screens", () => {
  it("preserves paise in payable amounts",()=>{expect(formatMoney(1.18)).toBe("₹1.18");});
  it("does not crash a screen when an optional or malformed date is absent", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("invalid")).toBe("—");
    expect(formatDateTime(null)).toBe("—");
    expect(formatShortDate("")).toBe("—");
  });
  it("compares due dates with the current calendar day, with today still on time", () => {
    expect(isOverdue("2026-10-13", "2026-10-14")).toBe(true);
    expect(isOverdue("2026-10-14", "2026-10-14")).toBe(false);
    expect(isOverdue("2026-10-15", "2026-10-14")).toBe(false);
    expect(isOverdue("invalid", "2026-10-14")).toBe(false);
  });
});
