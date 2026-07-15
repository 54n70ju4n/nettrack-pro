import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, ChevronRight, Loader2, Trash2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { getPointProgress } from "@/lib/pointProgress";
import { useFloors, useSpaces, usePoints, useInvalidateData } from "@/lib/queries";

export default function Floors() {
  const { data: floors = [], isLoading: loadingFloors } = useFloors();
  const { data: spaces = [], isLoading: loadingSpaces } = useSpaces();
  const { data: points = [], isLoading: loadingPoints } = usePoints();
  const loading = loadingFloors || loadingSpaces || loadingPoints;
  const invalidate = useInvalidateData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [floorName, setFloorName] = useState("");
  const [editFloor, setEditFloor] = useState(null);
  const [editName, setEditName] = useState("");
  const [floorToDelete, setFloorToDelete] = useState(null);

  const saveEditFloor = async () => {
    if (!editName.trim()) return;
    await base44.entities.Floor.update(editFloor.id, { name: editName.trim() });
    setEditFloor(null);
    setEditName("");
    invalidate();
  };

  const moveFloor = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= floors.length) return;
    const updates = [];
    updates.push(base44.entities.Floor.update(floors[index].id, { order: floors[newIndex].order }));
    updates.push(base44.entities.Floor.update(floors[newIndex].id, { order: floors[index].order }));
    await Promise.all(updates);
    invalidate();
  };

  const addFloor = async () => {
    if (!floorName.trim()) return;
    await base44.entities.Floor.create({ name: floorName.trim(), order: floors.length });
    setFloorName("");
    setDialogOpen(false);
    invalidate();
  };

  const confirmDeleteFloor = async () => {
    const id = floorToDelete.id;
    const floorSpaces = spaces.filter((s) => s.floor_id === id);
    for (const s of floorSpaces) {
      await base44.entities.InstallationPoint.deleteMany({ space_id: s.id });
      await base44.entities.Space.delete(s.id);
    }
    await base44.entities.Floor.delete(id);
    setFloorToDelete(null);
    invalidate();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Pisos</h1>
          <p className="text-muted-foreground text-sm mt-1">Estructura del edificio</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Agregar piso
        </Button>
      </div>

      {floors.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay pisos registrados aún</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" /> Crear primer piso
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {floors.map((f, idx) => {
            const floorSpaces = spaces.filter((s) => s.floor_id === f.id);
            const floorPoints = points.filter((p) => p.floor_id === f.id);
            const floorProgresses = floorPoints.map((p) => getPointProgress(p));
            const pct = floorProgresses.length ? Math.round(floorProgresses.reduce((a, b) => a + b, 0) / floorProgresses.length) : 0;

            return (
              <Link
                key={f.id}
                to={`/pisos/${f.id}`}
                className="block bg-white rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveFloor(idx, -1); }}
                        disabled={idx === 0}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveFloor(idx, 1); }}
                        disabled={idx === floors.length - 1}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {floorSpaces.length} espacios · {floorPoints.length} puntos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-right mr-2">
                      <p className="text-sm font-semibold">{pct}%</p>
                      <div className="w-24 h-1.5 bg-muted rounded-full mt-1">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditFloor(f); setEditName(f.name); }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFloorToDelete(f); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Agregar piso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nombre del piso (ej: Piso 1)" value={floorName} onChange={(e) => setFloorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFloor()} />
            <Button onClick={addFloor} className="w-full">Crear piso</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFloor} onOpenChange={(open) => { if (!open) setEditFloor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar piso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditFloor()} />
            <Button onClick={saveEditFloor} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!floorToDelete} onOpenChange={(open) => { if (!open) setFloorToDelete(null); }}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar piso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &ldquo;{floorToDelete?.name}&rdquo; junto con todos sus espacios y puntos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFloor} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}