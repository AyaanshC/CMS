"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { uploadToProject } from "@/lib/supabase/upload";

export function PhotoInput({ projectId, onUploaded, label = "Photo" }: { projectId: string; onUploaded: (path: string) => void; label?: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    try {
      onUploaded(await uploadToProject(projectId, file));
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      toast.add({ title: "Upload failed", description: (err as Error).message, type: "error" });
    }
  }
  return (
    <label className="block text-xs">
      <span className="font-semibold text-foreground">{label}</span>
      <input type="file" accept="image/*" capture="environment" onChange={onChange} className="mt-1 block w-full text-xs" />
      {status === "uploading" && <span className="text-muted-foreground">Uploading…</span>}
      {status === "done" && <span className="text-emerald-600">Uploaded</span>}
    </label>
  );
}
