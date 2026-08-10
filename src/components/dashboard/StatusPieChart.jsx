import React from "react";

// Lightweight SVG donut — replaces recharts (~370 kB) for the single status
// chart on the Dashboard. Segments are drawn as stroked arcs of one circle.
const SIZE = 180;
const STROKE = 30;
const RADIUS = 65; // midway between the old inner (50) and outer (80) radii
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 3; // px gap between segments, mimicking recharts' paddingAngle

export default function StatusPieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) return null;

  const single = data.length === 1;
  let offset = 0;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Distribución por estado">
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {data.map((d) => {
          const frac = d.value / total;
          const len = single ? CIRC : Math.max(0, frac * CIRC - GAP);
          const segment = (
            <circle
              key={d.name}
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke={d.color}
              strokeWidth={STROKE}
              strokeDasharray={`${len} ${CIRC - len}`}
              strokeDashoffset={-offset}
            >
              <title>{`${d.name}: ${d.value} (${Math.round(frac * 100)}%)`}</title>
            </circle>
          );
          offset += frac * CIRC;
          return segment;
        })}
      </g>
    </svg>
  );
}
