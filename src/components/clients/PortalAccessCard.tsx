"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { grantPortalAccess } from "@/app/actions/portal";
import type { Client } from "@/types";

export function PortalAccessCard({ client }: { client: Client }) {
  const [email, setEmail] = useState(client.email ?? "");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function grant() {
    setBusy(true);
    const r = await grantPortalAccess({ client_id: client.id, full_name: client.full_name, email });
    setBusy(false);
    if (r.ok) setLink(r.link);
    else toast.add({ title: "Could not grant access", description: r.error, type: "error" });
  }

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Client portal access</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="portal-email">Client email</Label>
          <Input id="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button size="sm" disabled={busy || !email} onClick={grant}>Create sign-in link</Button>
        {link && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">One-time link. Share it with the client over WhatsApp or email.</p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link)}>Copy</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
