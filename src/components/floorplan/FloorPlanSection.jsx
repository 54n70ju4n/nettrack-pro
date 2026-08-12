import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useInvalidateData } from "@/lib/queries";
import { useAction } from "@/lib/useAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, Upload, Loader2, X, Ruler } from "lucide-react";

// Pin colours mirror the app's status palette.
const STATUS_HEX = {
  pendiente: "#94a3b8",
  en_proceso: "#f59e0b",
  finalizado: "#22c55e",
  con_observaciones: "#ef4444",
};

const isPlaced = (p) => Number.isFinite(p.plan_x) && Number.isFinite(p.plan_y);

export default function FloorPlanSection({ floor, points }) {
  const navigate = useNavigate();
  const invalidate = useInvalidateData();
  const run = useAction();
  const containerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [placingId, setPlacingId] = useState(null);
  const [drag, setDrag] = useState(null); // { id, x, y, moved, startX, startY }
  const [w, setW] = useState(floor.width ?? "");
  const [l, setL] = useState(floor.length ?? "");

  const placed = points.filter(isPlaced);
  const unplaced = points.filter((p) => !isPlaced(p));
  const placingPoint = unplaced.find((p) => p.id === placingId) || points.find((p) => p.id === placingId);

  const uploadPlan = (e) => run(async () => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Floor.update(floor.id, { plan_url: file_url });
      invalidate();
    } finally {
      setUploading(false);
    }
  });

  const removePlan = () => run(async () => {
    await base44.entities.Floor.update(floor.id, { plan_url: "" });
    invalidate();
  });

  const saveDimensions = () => run(async () => {
    await base44.entities.Floor.update(floor.id, {
      width: w === "" ? null : Number(w),
      length: l === "" ? null : Number(l),
    });
    invalidate();
  });

  const coordsFromEvent = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const savePos = (id, x, y) => run(async () => {
    await base44.entities.InstallationPoint.update(id, { plan_x: x, plan_y: y });
    invalidate();
  });

  // Tap on the plan while a point is selected → place it there.
  const onPlanClick = (e) => {
    if (!placingId) return;
    const { x, y } = coordsFromEvent(e);
    savePos(placingId, x, y);
    setPlacingId(null);
  };

  const startDrag = (e, p) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ id: p.id, x: p.plan_x, y: p.plan_y, moved: false, startX: e.clientX, startY: e.clientY });
  };

  const onPinMove = (e) => {
    if (!drag) return;
    const { x, y } = coordsFromEvent(e);
    const moved = drag.moved || Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4;
    setDrag({ ...drag, x, y, moved });
  };

  // Release: a real drag saves the new position, a tap opens the checklist.
  const endDrag = (e, p) => {
    if (!drag || drag.id !== p.id) return;
    if (drag.moved) savePos(p.id, drag.x, drag.y);
    else navigate(`/checklist/${p.id}`);
    setDrag(null);
  };

  const unplace = (e, id) => {
    e.stopPropagation();
    savePos(id, null, null);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" /> Plano del piso
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
            <Input value={w} onChange={(e) => setW(e.target.value)} placeholder="Ancho" inputMode="decimal" className="w-16 h-8" />
            <span className="text-xs text-muted-foreground">×</span>
            <Input value={l} onChange={(e) => setL(e.target.value)} placeholder="Largo" inputMode="decimal" className="w-16 h-8" />
            <span className="text-xs text-muted-foreground">m</span>
            <Button size="sm" variant="outline" className="h-8" onClick={saveDimensions}>Guardar</Button>
          </div>
          <label className="inline-flex items-center gap-1.5 text-sm px-3 h-8 rounded-md border border-border cursor-pointer hover:bg-muted">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {floor.plan_url ? "Cambiar plano" : "Subir plano"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadPlan} />
          </label>
          {floor.plan_url && (
            <button onClick={removePlan} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500" title="Quitar plano">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!floor.plan_url ? (
        <label className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-center">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sube una imagen del plano para ubicar los puntos sobre él</span>
          <input type="file" accept="image/*" className="hidden" onChange={uploadPlan} />
        </label>
      ) : (
        <>
          {placingId && (
            <div className="flex items-center justify-between gap-2 text-xs bg-primary/10 text-primary rounded-lg px-3 py-2">
              <span>Toca el plano para ubicar «{placingPoint?.name}».</span>
              <button onClick={() => setPlacingId(null)} className="font-medium hover:underline">Cancelar</button>
            </div>
          )}
          <div
            ref={containerRef}
            onClick={onPlanClick}
            className={`relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 ${placingId ? "cursor-crosshair" : ""}`}
          >
            <img src={floor.plan_url} alt="Plano del piso" draggable={false} className="block w-full h-auto select-none pointer-events-none" />
            {placed.map((p) => {
              const pos = drag?.id === p.id ? { x: drag.x, y: drag.y } : { x: p.plan_x, y: p.plan_y };
              const color = STATUS_HEX[p.status] || STATUS_HEX.pendiente;
              return (
                <div
                  key={p.id}
                  onPointerDown={(e) => startDrag(e, p)}
                  onPointerMove={onPinMove}
                  onPointerUp={(e) => endDrag(e, p)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group touch-none cursor-grab active:cursor-grabbing"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  title={p.name}
                >
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: color }} />
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => unplace(e, p.id)}
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white border border-border text-muted-foreground hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Quitar del plano"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    <span className="absolute left-1/2 -translate-x-1/2 top-6 whitespace-nowrap text-[10px] font-medium bg-white/90 px-1 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none">
                      {p.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {unplaced.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Puntos sin ubicar ({unplaced.length}) — toca uno y luego toca el plano:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unplaced.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlacingId(placingId === p.id ? null : p.id)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${placingId === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_HEX[p.status] || STATUS_HEX.pendiente }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Arrastra un pin para moverlo · toca un pin para abrir su checklist.</p>
        </>
      )}
    </div>
  );
}
