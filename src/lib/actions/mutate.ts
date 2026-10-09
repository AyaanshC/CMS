import "server-only";
import { refresh } from "next/cache";
import type { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

export type Db = SupabaseClient<Database>;
type DbResult = { data: unknown; error: { message: string; code?: string } | null };

const FRIENDLY: Record<string, string> = {
  "42501": "You don't have permission to do this.",
  PGRST116: "You don't have permission to change this, or it no longer exists.",
  "23505": "That already exists.",
};

// Every server action goes through here: validate, write as the signed-in user
// (so RLS applies), then refresh so the workspace snapshot reloads.
export async function mutate<S extends z.ZodType>(
  schema: S,
  input: unknown,
  write: (data: z.infer<S>, db: Db) => PromiseLike<DbResult>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") };
  }
  const db = await createServerSupabase();
  const { data, error } = await write(parsed.data, db);
  if (error) return { ok: false, error: (error.code && FRIENDLY[error.code]) || error.message };
  refresh();
  const id = typeof data === "string" ? data : (data as { id?: string } | null)?.id;
  return { ok: true, id };
}
