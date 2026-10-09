import { createBrowserSupabase } from "./browser";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Uploads into the project's folder; storage RLS checks project access.
export async function uploadToProject(projectId: string, file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 50 MB or smaller.");
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `${projectId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await createBrowserSupabase().storage.from("project-files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  return path;
}
