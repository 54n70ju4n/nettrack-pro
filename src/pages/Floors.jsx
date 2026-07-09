import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, ChevronRight, Loader2, Trash2 } from "lucide-react";

export default function Floors() {
  const [floors, setFloors] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [floorName, setFloorName] = useState("");

  const load = () => {
    Promise.all([
      base44.entities.Floor.list("order", 100),
      base44.entities.Space.list("-created_date", 500),
      base44.entities.InstallationPoint.list("-created_date", 500),
    ]).then(([f, s, p]) => {
      setFloors(f);
      setSpaces(s);
      setPoints(p);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const addFloor = async () => {
    if (!floorName.trim()) return;
    await base44.entities.Floor.create({ name: floorName.trim(), order: floors.length });
    setFloorName("");
    setDialogOpen(false);
    load();
  };

  const deleteFloor = async (id) => {
    if (!confirm("¿Eliminar este piso y todos sus espacios y puntos?")) return;
    const floorSpaces = spaces.filter((s) => s.floor_id === id);
    for (const s of floorSpaces) {
      await base44.entities.InstallationPoint.deleteMany({ space_id: s.id });
      await base44.entities.Space.delete(s.id);
    }
    await base44.entities.Floor.delete(id);
    load();
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
          {floors.map((f) => {
            const floorSpaces = spaces.filter((s) => s.floor_id === f.id);
            const floorPoints = points.filter((p) => p.floor_id === f.id);
            const done = floorPoints.filter((p) => p.status === "finalizado").length;
            const pct = floorPoints.length ? Math.round((done / floorPoints.length) * 100) : 0;

            return (
              <Link
                key={f.id}
                to={`/pisos/${f.id}`}
                className="block bg-white rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold">{pct}%</p>
                      <div className="w-24 h-1.5 bg-muted rounded-full mt-1">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteFloor(f.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}