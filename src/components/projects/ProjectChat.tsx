"use client";
import { useRef, useState } from "react";
import { Paperclip, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { uploadToProject } from "@/lib/supabase/upload";
import { formatDateTime, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { Message } from "@/types";

export function ProjectChat({ projectId, messages }: { projectId: string; messages: Message[] }) {
  const { addMessage, me } = useAppStore();
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const input = useRef<HTMLInputElement>(null);
  const filtered = messages.filter(m => !search || `${m.content} ${m.file_name ?? ""} ${m.sender_name}`.toLowerCase().includes(search.toLowerCase()));
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || (!draft.trim() && !attachment)) return;
    setBusy(true);
    try {
      const path = attachment ? uploaded ?? await uploadToProject(projectId, attachment) : null;
      setUploaded(path);
      const result = await addMessage({ project_id: projectId, content: draft.trim(), file_url: path ?? undefined, file_name: attachment?.name });
      if (result.ok) { setDraft(""); setAttachment(null); setUploaded(null); if (input.current) input.current.value = ""; }
    } catch (error) {
      toast.add({ title: "Could not send attachment", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    } finally { setBusy(false); }
  }
  return <Card className="flex h-[min(650px,75dvh)] flex-col overflow-hidden">
    <div className="border-b p-3"><Input aria-label="Search messages" placeholder="Search this conversation…" value={search} onChange={e => { setSearch(e.target.value); setLimit(50); }} /></div>
    <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4" role="log" aria-label="Project conversation" aria-live="polite">
      {filtered.length > limit && <Button variant="outline" size="sm" onClick={() => setLimit(limit + 50)}>Load older messages</Button>}
      {!filtered.length && <p className="py-12 text-center text-muted-foreground">{search ? "No matching messages" : "Start a conversation with your project team."}</p>}
      {filtered.slice(-limit).map(message => <div key={message.id} className={cn("flex", message.sender_id === me.id ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[85%] rounded-xl border p-3 text-sm", message.sender_id === me.id ? "border-primary/20 bg-accent" : "bg-card")}>
          <p className="mb-1 text-xs font-semibold">{message.sender_name}</p>
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.file_url && <a href={message.file_url} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg border bg-background p-2 text-primary hover:underline">
            {/\.(png|jpe?g|gif|webp)$/i.test(message.file_name ?? "") ? <img src={message.file_url} alt={message.file_name ?? "Project attachment"} className="mb-2 max-h-48 rounded object-contain" /> : <FileText className="mb-1 size-5" />}
            {message.file_name ?? "Open attachment"}
          </a>}
          <p className="mt-2 text-[10px] text-muted-foreground">{formatDateTime(message.created_at)}</p>
        </div>
      </div>)}
    </div>
    <form onSubmit={send} className="space-y-2 border-t bg-card p-3">
      {attachment && <p className="text-xs text-muted-foreground">Attached: {attachment.name} <button type="button" disabled={busy} className="ml-2 underline" onClick={() => { setAttachment(null); setUploaded(null); if (input.current) input.current.value = ""; }}>Remove</button></p>}
      <div className="flex items-center gap-2">
        <input ref={input} type="file" className="hidden" accept="image/*,application/pdf" aria-label="Choose chat attachment" onChange={e => { setAttachment(e.target.files?.[0] ?? null); setUploaded(null); }} />
        <Button type="button" variant="ghost" size="icon" aria-label="Attach image or PDF" disabled={busy} onClick={() => input.current?.click()}><Paperclip className="size-4" /></Button>
        <Input aria-label="Message" placeholder="Type a message…" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} />
        <Button type="submit" size="icon" aria-label="Send message" disabled={busy || (!draft.trim() && !attachment)}><Send className="size-4" /></Button>
      </div>
      {busy && <p role="status" className="text-xs text-muted-foreground">Sending…</p>}
    </form>
  </Card>;
}
