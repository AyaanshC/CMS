"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "./BrandLoader";

export function InitialSplash() {
  const [phase, setPhase] = useState<"opening" | "closing" | "done">("opening");

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const startedAt = performance.now();
    let closingTimer: ReturnType<typeof setTimeout>;
    let removalTimer: ReturnType<typeof setTimeout>;
    let finishing = false;
    const finish = () => {
      if (finishing) return;
      finishing = true;
      const remaining = reducedMotion
        ? 0
        : Math.max(0, 800 - (performance.now() - startedAt));
      closingTimer = setTimeout(() => {
        setPhase("closing");
        removalTimer = setTimeout(
          () => setPhase("done"),
          reducedMotion ? 0 : 420,
        );
      }, remaining);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    // A slow image or third-party resource must never hold the site behind its introduction.
    const safetyTimer = setTimeout(finish, 6000);
    return () => {
      window.removeEventListener("load", finish);
      clearTimeout(safetyTimer);
      clearTimeout(closingTimer);
      clearTimeout(removalTimer);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div className="studio-intro" data-phase={phase}>
      <BrandLoader fullScreen />
    </div>
  );
}
