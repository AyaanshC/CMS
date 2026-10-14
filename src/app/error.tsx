"use client";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-[80dvh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center">
        <AlertCircle className="mx-auto mb-5 size-8 text-primary" />
        <h1 className="text-xl font-semibold">We couldn’t load this page</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your data is unavailable at the moment. Try again, or sign in again if
          your session has expired.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">
            Support reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button onClick={retry}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Link
            href="/login"
            className="self-center text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
