import React from "react";

const statusConfig = {
  pendiente: { label: "Pendiente", className: "bg-slate-100 text-slate-600" },
  en_proceso: { label: "En proceso", className: "bg-amber-50 text-amber-700" },
  finalizado: { label: "Finalizado", className: "bg-emerald-50 text-emerald-700" },
  con_observaciones: { label: "Con observaciones", className: "bg-red-50 text-red-700" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pendiente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}