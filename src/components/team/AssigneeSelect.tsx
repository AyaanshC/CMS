"use client";

import { useAppStore } from "@/lib/store";
import type { AppRole } from "@/types";

// Native select of active staff, optionally limited to some roles.
export function AssigneeSelect({
  value, onChange, roles, placeholder = "Unassigned", id, "aria-label":label="Assignee",
}: { value: string; onChange: (id: string) => void; roles?: AppRole[]; placeholder?: string; id?: string; "aria-label"?:string }) {
  const team = useAppStore((s) => s.team);
  const options = team.filter((m) => m.active && (!roles || m.roles.some((r) => roles.includes(r))));
  return (
    <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
      <option value="">{placeholder}</option>
      {options.map((m) => (
        <option key={m.id} value={m.id}>{m.full_name}{m.title ? ` · ${m.title}` : ""}</option>
      ))}
    </select>
  );
}
