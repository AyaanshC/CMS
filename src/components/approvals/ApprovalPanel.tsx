"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";

export function ApprovalPanel({
  title, confirmText, defaultSigner, onApprove, onReject,
}: {
  title: string;
  confirmText: string;
  defaultSigner: string;
  onApprove: (signer: string, note: string) => Promise<ActionResult>;
  onReject: (signer: string, reason: string) => Promise<ActionResult>;
}) {
  const [signer, setSigner] = useState(defaultSigner);
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<ActionResult>) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label htmlFor="ap-signer">Your full name</Label><Input id="ap-signer" value={signer} onChange={(e) => setSigner(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ap-note">Note (optional)</Label><Textarea id="ap-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>{confirmText}</span>
          </label>
          <Button className="w-full" disabled={busy || !agreed || !signer.trim()} onClick={() => act(() => onApprove(signer, note))}>Approve</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Request changes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label htmlFor="ap-reason">What should change?</Label><Textarea id="ap-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button variant="outline" className="w-full" disabled={busy || !reason.trim()} onClick={() => act(() => onReject(signer, reason))}>Send feedback</Button>
        </CardContent>
      </Card>
    </div>
  );
}
