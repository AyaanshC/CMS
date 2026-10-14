"use client";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/safe-next";
import { isDemoEnabled } from "@/lib/demo";

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired. Request a new one.",
  inactive:
    "Your account is inactive. Please contact the studio administrator.",
};

const DEMO_USERS = [
  { label: "Priya", role: "Principal Architect", email: "priya@studio.test" },
  { label: "Vikram", role: "Studio Director", email: "vikram@studio.test" },
  { label: "Ananya", role: "Project Manager", email: "ananya@studio.test" },
  { label: "Meera", role: "Finance Manager", email: "meera@studio.test" },
  { label: "Arun", role: "Client Portal", email: "arun@client.test" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<BrandLoader label="Opening your workspace" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "success" | "info";
    text: string;
  } | null>(
    params.get("error") && ERRORS[params.get("error")!]
      ? { type: "info", text: ERRORS[params.get("error")!] }
      : null,
  );
  const [busy, setBusy] = useState(false);

  function handleSelectDemo(demo: (typeof DEMO_USERS)[number]) {
    setEmail(demo.email);
    setPassword("password123");
    setSelectedDemo(demo.email);
    setMessage(null);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const destination = next && next !== "/" ? next : "/dashboard";
    try {
      if (isDemoEnabled() && selectedDemo === email) {
        const response = await fetch("/api/auth/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!response.ok)
          throw new Error("Could not start the development preview.");
        router.replace(email === "arun@client.test" ? "/portal" : destination);
      } else {
        const { error } = await createBrowserSupabase().auth.signInWithPassword(
          { email, password },
        );
        if (error) {
          setMessage({
            type: "error",
            text: error.message.toLowerCase().includes("fetch")
              ? "Unable to connect. Please try again shortly."
              : error.message,
          });
          return;
        }
        router.replace(destination);
      }
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Unable to sign in. Please check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await createBrowserSupabase().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setMessage(
        error
          ? {
              type: "error",
              text: "We couldn’t send a sign-in link. Please try again.",
            }
          : {
              type: "success",
              text: "A sign-in link has been sent to your email address.",
            },
      );
    } catch {
      setMessage({
        type: "error",
        text: "Unable to connect. Please try again shortly.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Column: Pure Architectural Visual with Studio Name */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-primary overflow-hidden p-12 text-white">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/studio-showcase.jpg"
            alt="Priya Designs Studio"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
        </div>

        {/* Top Studio Name in Bold White Font */}
        <div className="relative z-10 flex flex-col justify-between">
          <h1 className="text-lg font-medium tracking-tight text-white">
            Priya Designs Studio
          </h1>
          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-white/70">
              The studio workspace
            </p>
            <p className="font-editorial text-5xl leading-tight">
              Great spaces.
              <br />
              <span className="italic">Thoughtfully managed.</span>
            </p>
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-white/75">
              Your projects, people, and the details that bring it all together.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Form Panel */}
      <div className="w-full lg:w-[54%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 overflow-y-auto">
        {/* Mobile Brand Header */}
        <div className="flex lg:hidden items-center justify-between pb-6 border-b border-border/60 mb-6">
          <span className="font-heading font-bold text-base tracking-tight text-foreground">
            Priya Designs Studio
          </span>
          <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
            Studio MIS
          </span>
        </div>

        {/* Main Sign-In Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto space-y-6">
          {/* Header Typography */}
          <div className="space-y-1.5">
            <h2 className="font-editorial text-4xl tracking-tight text-foreground">
              Sign in
            </h2>
            <p className="text-sm text-muted-foreground">
              Welcome back. Sign in to your studio workspace.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border border-border/50 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setMessage(null);
              }}
              className={`py-1.5 rounded-md transition-all ${
                mode === "password"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("magic-link");
                setMessage(null);
              }}
              className={`py-1.5 rounded-md transition-all ${
                mode === "magic-link"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Magic link
            </button>
          </div>

          {/* Status Alert Banner */}
          {message && (
            <div
              role="alert"
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
                message.type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                  : message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
              }`}
            >
              {message.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              ) : message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              )}
              <div className="flex-1 leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* Form */}
          {mode === "password" ? (
            <form onSubmit={signInWithPassword} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground/85">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@studio.test"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedDemo(null);
                    }}
                    className="pl-10 h-10 rounded-lg bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground/85">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSelectedDemo(null);
                    }}
                    className="pl-10 pr-10 h-10 rounded-lg bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={busy || !email || !password}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="magic-email"
                  className="text-xs font-medium text-foreground/85"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@studio.test"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedDemo(null);
                    }}
                    className="pl-10 h-10 rounded-lg bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A one-time sign-in link will be delivered to your inbox.
                </p>
              </div>

              <Button
                type="submit"
                disabled={busy || !email}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <span>Send sign-in link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Development-only demo access */}
          {isDemoEnabled() && (
            <div className="pt-6 border-t border-border/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Development preview
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/75">
                  password: password123
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_USERS.map((user) => {
                  const isSelected =
                    selectedDemo === user.email || email === user.email;
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => handleSelectDemo(user)}
                      className={`text-xs p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-medium"
                          : "bg-muted/30 border-border/60 text-foreground/80 hover:bg-muted/70 hover:border-border"
                      }`}
                    >
                      <div className="font-medium leading-none mb-0.5 truncate">
                        {user.label}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected
                            ? "text-neutral-300 dark:text-neutral-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {user.role}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Studio Footer */}
        <div className="pt-8 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>Priya Designs Studio &bull; MIS</span>
          <Link href="/" className="text-xs text-primary hover:underline">
            Back to studio website
          </Link>
        </div>
      </div>
    </div>
  );
}
