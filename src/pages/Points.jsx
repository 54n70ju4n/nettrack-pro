import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import DeviceIcon from "@/components/shared/DeviceIcon";
import { Loader2, Search, ChevronRight, Pencil } from "lucide-react";

export default function Points() {
  const [points, setPoints] = useState([]);
  const [floors, setFloors] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFloor, setFilterFloor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [editPoint, setEditPoint] = useState(null);
  const [editPointName, setEditPointName] = useState("");
  const [editPointType, setEditPointType] = useState("ethernet");

  const saveEditPoint = async () => {
    if (!editPointName.trim()) return;
    await base44.entities.InstallationPoint.update(editPoint.id, { name: editPointName.trim(), device_type: editPointType });
    setEditPoint(null);
    const p = await base44.entities.InstallationPoint.list("-created_date", 500);
    setPoints(p);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.InstallationPoint.list("-created_date", 500),
      base44.entities.Floor.list("order", 100),
      base44.entities.Space.list("-created_date", 500),
    ]).then(([p, f, s]) => {
      setPoints(p);
      setFloors(f);
      setSpaces(s);
      setLoading(false);
    });
  }, []);

  const floorMap = useMemo(() => Object.fromEntries(floors.map((f) => [f.id, f.name])), [floors]);
  const spaceMap = useMemo(() => Object.fromEntries(spaces.map((s) => [s.id, s.name])), [spaces]);

  const filtered = useMemo(() => {
    return points.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterFloor !== "all" && p.floor_id !== filterFloor) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterType !== "all" && p.device_type !== filterType) return false;
      return true;
    });
  }, [points, search, filterFloor, filterStatus, filterType]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Puntos de instalación</h1>
        <p className="text-muted-foreground text-sm mt-1">{filtered.length} de {points.length} puntos</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar punto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Piso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {floors.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="con_observaciones">Con obs.</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ethernet">Ethernet</SelectItem>
            <SelectItem value="camara">Cámara</SelectItem>
            <SelectItem value="access_point">AP WiFi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Punto</div>
          <div className="col-span-2">Piso</div>
          <div className="col-span-2">Espacio</div>
          <div className="col-span-2">Técnico</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No se encontraron puntos</p>
          ) : (
            filtered.map((pt) => (
              <Link key={pt.id} to={`/checklist/${pt.id}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors items-center">
                <div className="col-span-3 flex items-center gap-2.5">
                  <DeviceIcon type={pt.device_type} size="sm" />
                  <span className="font-medium text-sm">{pt.name}</span>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">{floorMap[pt.floor_id] || "—"}</div>
                <div className="col-span-2 text-sm text-muted-foreground">{spaceMap[pt.space_id] || "—"}</div>
                <div className="col-span-2 text-sm text-muted-foreground">{pt.technician || "—"}</div>
                <div className="col-span-2"><StatusBadge status={pt.status} /></div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditPoint(pt); setEditPointName(pt.name); setEditPointType(pt.device_type); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!editPoint} onOpenChange={(open) => { if (!open) setEditPoint(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar punto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={editPointName} onChange={(e) => setEditPointName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditPoint()} />
            <Select value={editPointType} onValueChange={setEditPointType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ethernet">Ethernet</SelectItem>
                <SelectItem value="camara">Cámara CCTV</SelectItem>
                <SelectItem value="access_point">AP WiFi</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={saveEditPoint} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}