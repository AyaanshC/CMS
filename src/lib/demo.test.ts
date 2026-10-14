import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoEnabled, isDemoEmail } from "./demo";
import { getMockWorkspaceSnapshot, DEMO_PROFILES } from "./data/mock-workspace";
import { scopeDemoWorkspace } from "./data/scope-demo-workspace";

afterEach(() => vi.unstubAllEnvs());
describe("development demo isolation", () => {
  it("never enables demo identities in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO", "true");
    expect(isDemoEnabled()).toBe(true);
    expect(isDemoEmail("constructor")).toBe(false);
    expect(isDemoEmail("someone@example.com")).toBe(false);
  });
  it("defaults to live data even in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO", "");
    expect(isDemoEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO", "true");
    expect(isDemoEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoEnabled()).toBe(false);
  });
  it("only exposes the sample client's projects and published client records", () => {
    const snapshot = getMockWorkspaceSnapshot(
      DEMO_PROFILES["arun@client.test"],
    );
    const other = snapshot.projects.find(
      (p) => p.client_id !== snapshot.me.client_id,
    )!;
    const own = snapshot.projects.find(
      (p) => p.client_id === snapshot.me.client_id,
    )!;
    snapshot.tasks.push({
      id: "internal",
      project_id: own.id,
      title: "Private",
      status: "todo",
      priority: "medium",
      is_internal: true,
      created_at: "2026-10-01",
    });
    snapshot.boqs.push({
      ...snapshot.boqs[0],
      id: "private-draft",
      project_id: own.id,
      status: "draft",
    });
    const scoped = scopeDemoWorkspace(snapshot);
    expect(scoped.projects.map((p) => p.id)).not.toContain(other.id);
    expect(
      scoped.boqs.every((b) => b.project_id === own.id && b.status !== "draft"),
    ).toBe(true);
    expect(scoped.tasks.some((t) => t.id === "internal")).toBe(false);
    expect(
      scoped.files.every((f) => f.project_id === own.id && f.is_client_visible),
    ).toBe(true);
    expect(scoped.projectCosts).toEqual([]);
    expect(scoped.team).toEqual([]);
  });
});
