"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";

export function ApprovalPanel({
  title,
  confirmText,
  defaultSigner,
  onApprove,
  onReject,
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
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const inputId = useId();

  const act = async (fn: () => Promise<ActionResult>) => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await fn();
      setFeedback({
        ok: result.ok,
        text: result.ok ? "Your decision has been recorded." : result.error,
      });
    } catch {
      setFeedback({
        ok: false,
        text: "Your decision could not be saved. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`rounded-lg border p-4 text-sm ${feedback.ok ? "border-primary/20 bg-accent text-primary" : "border-destructive/20 bg-destructive/5 text-destructive"}`}
        >
          {feedback.text}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2" aria-busy={busy}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`${inputId}-signer`}>Your full name</Label>
              <Input
                id={`${inputId}-signer`}
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${inputId}-note`}>Note (optional)</Label>
              <Textarea
                id={`${inputId}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              <span>{confirmText}</span>
            </label>
            <Button
              className="w-full"
              disabled={busy || feedback?.ok || !agreed || !signer.trim()}
              onClick={() => act(() => onApprove(signer.trim(), note))}
            >
              {busy ? "Saving decision…" : "Approve"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`${inputId}-reason`}>What should change?</Label>
              <Textarea
                id={`${inputId}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={
                busy || feedback?.ok || !reason.trim() || !signer.trim()
              }
              onClick={() => act(() => onReject(signer.trim(), reason))}
            >
              Send feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
