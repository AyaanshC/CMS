import { Info } from "lucide-react";

// Every metric explains its formula on hover/focus.
export function MetricInfo({ formula }: { formula: string }) {
  return (
    <button type="button" title={formula} aria-label={`How this is calculated: ${formula}`} className="inline-flex text-muted-foreground hover:text-foreground">
      <Info className="w-3.5 h-3.5" />
    </button>
  );
}
