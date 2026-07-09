import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ProgressRing from "@/components/shared/ProgressRing";
import StatusBadge from "@/components/shared/StatusBadge";
import DeviceIcon from "@/components/shared/DeviceIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b"];
const STATUS_COLORS = { pendiente: "#94a3b8", en_proceso: "#f59e0b", finalizado: "#22c55e", con_observaciones: "#ef4444" };

export default function Dashboard() {
  const [points, setPoints] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTech, setFilterTech] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.InstallationPoint.list("-created_date", 500),
      base44.entities.Floor.list("order", 100),
    ]).then(([p, f]) => {
      setPoints(p);
      setFloors(f);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return points.filter((p) => {
      if (filterFloor !== "all" && p.floor_id !== filterFloor) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterTech !== "all" && p.technician !== filterTech) return false;
      return true;
    });
  }, [points, filterFloor, filterStatus, filterTech]);

  const technicians = useMemo(() => [...new Set(points.map((p) => p.technician).filter(Boolean))], [points]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const finalizados = filtered.filter((p) => p.status === "finalizado").length;
    const enProceso = filtered.filter((p) => p.status === "en_proceso").length;
    const pendientes = filtered.filter((p) => p.status === "pendiente").length;
    const conObs = filtered.filter((p) => p.status === "con_observaciones").length;
    const pct = total ? (finalizados / total) * 100 : 0;
    return { total, finalizados, enProceso, pendientes, conObs, pct };
  }, [filtered]);

  const floorData = useMemo(() => {
    return floors.map((f) => {
      const fp = filtered.filter((p) => p.floor_id === f.id);
      const done = fp.filter((p) => p.status === "finalizado").length;
      return { name: f.name, total: fp.length, done, pct: fp.length ? Math.round((done / fp.length) * 100) : 0 };
    }).filter((f) => f.total > 0);
  }, [floors, filtered]);

  const deviceData = useMemo(() => {
    const types = ["ethernet", "camara", "access_point"];
    const labels = { ethernet: "Ethernet", camara: "Cámaras", access_point: "AP WiFi" };
    return types.map((t) => {
      const fp = filtered.filter((p) => p.device_type === t);
      const done = fp.filter((p) => p.status === "finalizado").length;
      return { name: labels[t], total: fp.length, done, pct: fp.length ? Math.round((done / fp.length) * 100) : 0 };
    }).filter((d) => d.total > 0);
  }, [filtered]);

  const statusPieData = useMemo(() => {
    return [
      { name: "Pendiente", value: stats.pendientes, color: STATUS_COLORS.pendiente },
      { name: "En proceso", value: stats.enProceso, color: STATUS_COLORS.en_proceso },
      { name: "Finalizado", value: stats.finalizados, color: STATUS_COLORS.finalizado },
      { name: "Con obs.", value: stats.conObs, color: STATUS_COLORS.con_observaciones },
    ].filter((d) => d.value > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Avance general de la instalación</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Piso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pisos</SelectItem>
            {floors.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="con_observaciones">Con observaciones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTech} onValueChange={setFilterTech}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los técnicos</SelectItem>
            {technicians.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<ProgressRing percentage={stats.pct} size={56} strokeWidth={5} />} label="Avance general" value={`${Math.round(stats.pct)}%`} />
        <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} label="Finalizados" value={stats.finalizados} sub={`de ${stats.total}`} color="bg-emerald-50" />
        <KpiCard icon={<Clock className="w-5 h-5 text-amber-600" />} label="En proceso" value={stats.enProceso} color="bg-amber-50" />
        <KpiCard icon={<AlertCircle className="w-5 h-5 text-red-500" />} label="Con observaciones" value={stats.conObs} color="bg-red-50" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Floor progress */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Avance por piso</h3>
          {floorData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={floorData} layout="vertical" margin={{ left: 4 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                <YAxis type="category" dataKey="name" width={80} className="text-xs" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="pct" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Distribución por estado</h3>
          {statusPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay datos aún</p>
          ) : (
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device type progress */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Avance por tipo de dispositivo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {deviceData.map((d) => (
            <div key={d.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <ProgressRing percentage={d.pct} size={52} strokeWidth={4} />
              <div>
                <p className="font-medium text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.done}/{d.total} completados</p>
              </div>
            </div>
          ))}
          {deviceData.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-4">No hay datos aún</p>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
      <div className={`flex items-center justify-center rounded-xl ${color || ""}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value} {sub && <span className="text-xs font-normal text-muted-foreground">{sub}</span>}</p>
      </div>
    </div>
  );
}