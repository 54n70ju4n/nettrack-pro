export default function ProgressBar({ value, className, barClassName }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`h-1.5 bg-muted rounded-full overflow-hidden ${className || ""}`}>
      <div
        className={`h-full bg-primary rounded-full transition-all duration-300 ${barClassName || ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}