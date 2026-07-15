import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, AlertTriangle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useFloors, useSpaces, usePoints, useInvalidateData } from "@/lib/queries";
import DataError from "@/components/shared/DataError";

const DEVICE_CODE = { ethernet: "ETH", camara: "CAM", access_point: "AP" };

// Digits of the floor name: "Piso 2" -> "2", "P4" -> "4".
function floorNum(floor) {
  const m = (floor?.name || "").match(/\d+/);
  return m ? m[0] : null;
}

// Numeric space name stays as-is; text becomes its first 3 letters, upper-cased
// and accent-stripped: "201" -> "201", "Pasillo" -> "PAS", "Exposición" -> "EXP".
function spaceCode(space) {
  const name = (space?.name || "").trim();
  if (/^\d+$/.test(name)) return name;
  const letters = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 3) || "ESP").toUpperCase();
}

export default function RenamePointsSection() {
  const { toast } = useToast();
  const floorsQ = useFloors();
  const spacesQ = useSpaces();
  const pointsQ = usePoints();
  const floors = floorsQ.data ?? [];
  const spaces = spacesQ.data ?? [];
  const points = pointsQ.data ?? [];
  const invalidate = useInvalidateData();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  const { rows, changes, warnings } = useMemo(() => {
    const floorById = Object.fromEntries(floors.map((f) => [f.id, f]));
    const spaceById = Object.fromEntries(spaces.map((s) => [s.id, s]));

    // Group by floor + space + device type so numbering restarts per group.
    const groups = new Map();
    for (const p of points) {
      const key = `${p.floor_id}|${p.space_id}|${p.device_type}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const newNameById = {};
    const warn = new Set();
    for (const pts of groups.values()) {
      pts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) ||
        (a.name || "").localeCompare(b.name || "", undefined, { numeric: true }));
      pts.forEach((p, i) => {
        const f = floorById[p.floor_id];
        const s = spaceById[p.space_id];
        const fn = floorNum(f);
        const dc = DEVICE_CODE[p.device_type] || (p.device_type || "DEV").slice(0, 3).toUpperCase();
        if (!f) warn.add(`Un punto no tiene piso asociado y se omitirá.`);
        else if (fn === null) warn.add(`El piso "${f.name}" no tiene un número en su nombre.`);
        if (!s) warn.add(`Un punto no tiene espacio asociado y se omitirá.`);
        newNameById[p.id] = (f && s && fn !== null)
          ? `P${fn}-${spaceCode(s)}-${dc}${i + 1}`
          : null; // can't build a valid name
      });
    }

    const rows = points
      .map((p) => ({ id: p.id, old: p.name || "", neu: newNameById[p.id], valid: !!newNameById[p.id] }))
      .map((r) => ({ ...r, changed: r.valid && r.old !== r.neu }))
      .sort((a, b) => (a.neu || a.old || "").localeCompare(b.neu || b.old || "", undefined, { numeric: true }));

    return { rows, changes: rows.filter((r) => r.changed), warnings: [...warn] };
  }, [points, floors, spaces]);

  const apply = async () => {
    setApplying(true);
    setProgress(0);
    let done = 0;
    let failed = 0;
    for (const r of changes) {
      try {
        await base44.entities.InstallationPoint.update(r.id, { name: r.neu });
      } catch (e) {
        console.error("No se pudo renombrar", r.id, e);
        failed++;
      }
      done++;
      setProgress(done);
    }
    setApplying(false);
    setConfirmOpen(false);
    invalidate();
    if (failed) {
      toast({ variant: "destructive", title: "Renombrado parcial", description: `${done - failed} aplicados, ${failed} fallaron.` });
    } else {
      toast({ title: "Puntos renombrados", description: `${done} puntos actualizados.` });
    }
  };

  if (floorsQ.isLoading || spacesQ.isLoading || pointsQ.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }
  if (floorsQ.isError || spacesQ.isError || pointsQ.isError) {
    return <DataError onRetry={invalidate} />;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">Renombrar puntos de instalación</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Aplica el formato <span className="font-mono">P&lt;piso&gt;-&lt;espacio&gt;-&lt;DISPOSITIVO&gt;&lt;n&gt;</span> a
              todos los puntos (ej: <span className="font-mono">P2-201-ETH1</span>). El número de piso sale de su nombre,
              el código de espacio es el número tal cual o las 3 primeras letras, y la numeración reinicia por espacio y tipo.
            </p>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Advertencias
            </div>
            <ul className="text-xs text-amber-700/90 list-disc pl-5 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{changes.length}</span> de {rows.length} puntos cambiarán de nombre.
          </p>
          <Button size="sm" disabled={changes.length === 0} onClick={() => setConfirmOpen(true)}>
            <Wand2 className="w-4 h-4 mr-2" /> Aplicar renombrado
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Vista previa</h3>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border text-sm">
            {rows.map((r) => (
              <div key={r.id} className={`flex items-center gap-3 py-2 ${r.changed ? "" : "opacity-50"}`}>
                <span className="flex-1 min-w-0 truncate text-muted-foreground">{r.old || <em>(sin nombre)</em>}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className={`flex-1 min-w-0 truncate font-mono ${r.valid ? (r.changed ? "text-primary font-medium" : "") : "text-red-500"}`}>
                  {r.valid ? r.neu : "— no se puede generar —"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!o && !applying) setConfirmOpen(false); }}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Renombrar {changes.length} puntos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizará el nombre de {changes.length} puntos de instalación en la base de datos.
              Esta acción no se puede deshacer automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); apply(); }}
              disabled={applying}
            >
              {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aplicando {progress}/{changes.length}</> : "Sí, renombrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
