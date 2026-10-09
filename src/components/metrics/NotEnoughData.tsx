export function NotEnoughData({ hint }: { hint?: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      Not enough data yet{hint ? <span className="block text-xs mt-0.5">{hint}</span> : null}
    </p>
  );
}
