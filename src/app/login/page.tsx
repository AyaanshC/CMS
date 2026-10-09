"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/safe-next";

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired. Request a new one.",
  inactive: "Your account is inactive. Contact the studio.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [busy, setBusy] = useState(false);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    router.replace(next);
    router.refresh();
  }

  async function sendMagicLink() {
    if (!email) return setMessage("Enter your email first.");
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    setMessage(error ? error.message : "Check your email for a sign-in link.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-2">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={signInWithPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" className="w-full" disabled={busy || !password}>Sign in</Button>
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={sendMagicLink}>
              Email me a sign-in link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
