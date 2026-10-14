import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  cookie: "",
  error: null as null | { name: string },
  set: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.cookie ? { value: state.cookie } : undefined),
    set: state.set,
    getAll: () => [
      { name: "sb-example-auth-token.0", value: "live-session" },
      { name: "preference", value: "keep" },
    ],
    delete: state.remove,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: state.error }),
    },
  }),
}));
import { getSessionProfile } from "./auth";
import { POST } from "@/app/api/auth/demo-login/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO", "true");
  state.cookie = "";
  state.error = null;
  state.set.mockClear();
  state.remove.mockClear();
});
afterEach(() => vi.unstubAllEnvs());
describe("session and demo boundaries", () => {
  it("clears live credentials when explicitly entering a development preview", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ email: "arun@client.test" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(state.remove).toHaveBeenCalledWith("sb-example-auth-token.0");
    expect(state.remove).not.toHaveBeenCalledWith("preference");
  });
  it("ignores a forged demo cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    state.cookie = "priya@studio.test";
    await expect(getSessionProfile()).rejects.toThrow("REDIRECT:/login");
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ email: state.cookie }),
      }),
    );
    expect(response.status).toBe(404);
    expect(state.set).not.toHaveBeenCalled();
  });
  it("requires a valid explicitly selected development identity", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await POST(
      new Request("http://localhost/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ email: "constructor" }),
      }),
    );
    expect(response.status).toBe(400);
    state.cookie = "arun@client.test";
    expect(await getSessionProfile()).toMatchObject({
      kind: "client",
      is_demo: true,
      email: state.cookie,
    });
  });
  it("does not turn authentication failure into a demo identity", async () => {
    vi.stubEnv("NODE_ENV", "production");
    state.error = { name: "AuthRetryableFetchError" };
    await expect(getSessionProfile()).rejects.toThrow(
      "Unable to verify your session",
    );
  });
});
