export const PROJECT_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    tabs: [{ id: "overview", label: "Project summary" }],
  },
  {
    id: "design",
    label: "Design",
    tabs: [
      { id: "boq", label: "Estimates & BOQ" },
      { id: "materials", label: "Materials" },
      { id: "files", label: "Files & drawings" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    tabs: [
      { id: "tasks", label: "Tasks" },
      { id: "snags", label: "Snags" },
      { id: "procurement", label: "Procurement" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    tabs: [
      { id: "fees", label: "Fees & stages" },
      { id: "changes", label: "Scope changes" },
      { id: "finance", label: "Invoices & expenses" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    tabs: [
      { id: "updates", label: "Site updates" },
      { id: "messages", label: "Messages" },
    ],
  },
] as const;

export function resolveProjectTab(
  requested: string | null,
  execution: boolean,
) {
  const allowed = PROJECT_GROUPS.flatMap((g) =>
    g.tabs.map((t) => t.id as string),
  );
  return requested &&
    allowed.includes(requested) &&
    (requested !== "procurement" || execution)
    ? requested
    : "overview";
}
