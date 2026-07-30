import React from "react";

// Compact per-phase progress chips (Piso / Rack). Accepts the object returned by
// getPointPhaseProgress / aggregatePhaseProgress. Phases with no items are hidden.
const PHASE_STYLES = {
  piso: { label: "Piso", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  rack: { label: "Rack", dot: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
};

export default function PhaseChips({ phases, className = "" }) {
  const entries = ["piso", "rack"].filter((k) => phases?.[k]?.total > 0);
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {entries.map((k) => {
        const s = PHASE_STYLES[k];
        const { pct } = phases[k];
        return (
          <span key={k} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label} {pct}%
          </span>
        );
      })}
    </div>
  );
}
