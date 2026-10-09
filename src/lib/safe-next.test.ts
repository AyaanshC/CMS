import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-site paths", () => expect(safeNext("/projects/1")).toBe("/projects/1"));
  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
  });
  it("defaults to root", () => expect(safeNext(null)).toBe("/"));
});
