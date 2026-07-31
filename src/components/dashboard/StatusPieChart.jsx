import React from "react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Recharts is heavy (~380 kB). Keeping it in its own module lets the Dashboard
// lazy-load it, so the KPI numbers paint without waiting for the chart library.
export default function StatusPieChart({ data }) {
  return (
    <ResponsiveContainer width={180} height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
