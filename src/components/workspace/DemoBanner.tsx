"use client";
import { useAppStore } from "@/lib/store";

export function DemoBanner() {
  const demo = useAppStore((s) => s.me.is_demo);
  if (!demo) return null;
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
    >
      Development preview · Sample data · Read-only
    </div>
  );
}
