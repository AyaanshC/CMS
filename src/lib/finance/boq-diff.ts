import type { BOQVersion, BOQLineItem } from "@/types";
import { round2 } from "./money";
type Located = { item: BOQLineItem; section: string; key: string };
function locate(boq: BOQVersion): Located[] {
  const occurrences = new Map<string,number>();
  return boq.sections.flatMap(section => section.items.map(item => {
    const scope = `${section.room_id ?? section.room_name ?? section.name ?? ""}|${section.category}`;
    const fallback = `${scope}|${item.description}|${item.unit}`;
    const occurrence = occurrences.get(fallback) ?? 0; occurrences.set(fallback,occurrence+1);
    return { item, section: `${section.room_name ?? section.name ?? "General"} · ${section.category}`, key: item.line_key ?? `${fallback}|${occurrence}` };
  }));
}
export function compareBoqs(previous: BOQVersion,current: BOQVersion) {
  const before = new Map(locate(previous).map(row=>[row.key,row]));
  const after = new Map(locate(current).map(row=>[row.key,row]));
  return [...new Set([...before.keys(),...after.keys()])].map(key=>{
    const old = before.get(key), next = after.get(key);
    const changed = old && next && ["description","specifications","unit","quantity","unit_rate","remarks"].some(field=>old.item[field as keyof BOQLineItem]!==next.item[field as keyof BOQLineItem]);
    return { key, section: next?.section ?? old!.section, before: old?.item, after: next?.item,
      status: !old?"Added":!next?"Removed":changed?"Changed":"Unchanged", difference: round2((next?.item.total??0)-(old?.item.total??0)) };
  });
}
