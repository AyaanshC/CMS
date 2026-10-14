import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const state = vi.hoisted(() => ({
  demo: false,
  fail: false,
  refresh: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-demo", () => ({ isDemoRequest: async () => state.demo }));
vi.mock("next/cache", () => ({ refresh: state.refresh }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => {
    if (state.fail) throw new Error("Offline");
    return {};
  },
}));
import { mutate } from "./mutate";
const schema = z.object({ title: z.string() });
beforeEach(() => {
  state.demo = false;
  state.fail = false;
  state.refresh.mockClear();
});
afterEach(() => vi.restoreAllMocks());
describe("workspace write reliability", () => {
  it("prevents demo actions from writing to a live workspace", async () => {
    state.demo = true;
    const write = vi.fn(async () => ({ data: null, error: null }));
    expect(await mutate(schema, { title: "Change" }, write)).toMatchObject({
      ok: false,
    });
    expect(write).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });
  it("returns a recoverable error when the connection fails", async () => {
    state.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await mutate(schema, { title: "Change" }, async () => ({
        data: null,
        error: null,
      })),
    ).toMatchObject({
      ok: false,
      error: "We couldn’t save your changes. Please try again.",
    });
    expect(state.refresh).not.toHaveBeenCalled();
  });
  it("preserves permission errors and refreshes only successful writes", async () => {
    expect(
      await mutate(schema, { title: "Change" }, async () => ({
        data: null,
        error: { message: "denied", code: "42501" },
      })),
    ).toMatchObject({
      ok: false,
      error: "You don't have permission to do this.",
    });
    expect(state.refresh).not.toHaveBeenCalled();
    expect(
      await mutate(schema, { title: "Change" }, async () => ({
        data: { id: "saved" },
        error: null,
      })),
    ).toEqual({ ok: true, id: "saved" });
    expect(state.refresh).toHaveBeenCalledOnce();
  });
});
