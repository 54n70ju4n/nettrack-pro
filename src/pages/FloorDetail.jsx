import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";
import DeviceIcon from "@/components/shared/DeviceIcon";
import { ArrowLeft, Plus, Loader2, Trash2, ChevronRight, Pencil, Download } from "lucide-react";
import ProgressBar from "@/components/shared/ProgressBar";
import { getPointProgress } from "@/lib/pointProgress";
import { exportFloorPdf } from "@/lib/exportFloorPdf";

export default function FloorDetail() {
  const { floorId } = useParams();
  const [floor, setFloor] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spaceDialog, setSpaceDialog] = useState(false);
  const [pointDialog, setPointDialog] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState("habitacion");
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [pointName, setPointName] = useState("");
  const [deviceType, setDeviceType] = useState("ethernet");
  const [editFloorName, setEditFloorName] = useState(false);
  const [floorEditVal, setFloorEditVal] = useState("");
  const [editSpace, setEditSpace] = useState(null);
  const [editSpaceName, setEditSpaceName] = useState("");
  const [editPoint, setEditPoint] = useState(null);
  const [editPointName, setEditPointName] = useState("");
  const [editPointType, setEditPointType] = useState("ethernet");
  const [editSpaceType, setEditSpaceType] = useState("habitacion");

  const exportPdf = () => exportFloorPdf(floor, sortedSpaces, points);

  const saveFloorName = async () => {
    if (!floorEditVal.trim()) return;
    await base44.entities.Floor.update(floorId, { name: floorEditVal.trim() });
    setEditFloorName(false);
    load();
  };

  const saveEditSpace = async () => {
    if (!editSpaceName.trim()) return;
    await base44.entities.Space.update(editSpace.id, { name: editSpaceName.trim(), space_type: editSpaceType });
    setEditSpace(null);
    load();
  };

  const saveEditPoint = async () => {
    if (!editPointName.trim()) return;
    await base44.entities.InstallationPoint.update(editPoint.id, { name: editPointName.trim(), device_type: editPointType });
    setEditPoint(null);
    load();
  };

  const load = () => {
    Promise.all([
      base44.entities.Floor.get(floorId),
      base44.entities.Space.filter({ floor_id: floorId }, "order", 500),
      base44.entities.InstallationPoint.filter({ floor_id: floorId }, "order", 500),
    ]).then(([f, s, p]) => {
      setFloor(f);
      setSpaces(s);
      setPoints(p);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [floorId]);

  const sortedSpaces = useMemo(() => {
    const typeOrder = { habitacion: 0, sala: 1, pasillo: 2, otro: 99 };
    return [...spaces].sort((a, b) => {
      const typeDiff = (typeOrder[a.space_type] ?? 99) - (typeOrder[b.space_type] ?? 99);
      if (typeDiff !== 0) return typeDiff;
      return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [spaces]);

  const addSpace = async () => {
    if (!spaceName.trim()) return;
    await base44.entities.Space.create({ name: spaceName.trim(), floor_id: floorId, space_type: spaceType });
    setSpaceName("");
    setSpaceDialog(false);
    load();
  };

  const addPoint = async () => {
    if (!pointName.trim() || !selectedSpace) return;
    await base44.entities.InstallationPoint.create({
      name: pointName.trim(), floor_id: floorId, space_id: selectedSpace, device_type: deviceType,
    });
    setPointName("");
    setPointDialog(false);
    load();
  };

  const deleteSpace = async (id) => {
    if (!confirm("¿Eliminar espacio y sus puntos?")) return;
    await base44.entities.InstallationPoint.deleteMany({ space_id: id });
    await base44.entities.Space.delete(id);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/pisos" className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-bold tracking-tight">{floor?.name}</h1>
            <button
              onClick={() => { setFloorEditVal(floor?.name || ""); setEditFloorName(true); }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{spaces.length} espacios · {points.length} puntos</p>
        </div>
        <Button onClick={exportPdf} size="sm" variant="outline"><Download className="w-4 h-4 mr-1.5" /> Exportar PDF</Button>
        <Button onClick={() => setSpaceDialog(true)} size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" /> Espacio</Button>
        <Button onClick={() => setPointDialog(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Punto</Button>
      </div>

      {spaces.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">No hay espacios en este piso</p>
          <Button onClick={() => setSpaceDialog(true)} variant="outline" size="sm" className="mt-3"><Plus className="w-4 h-4 mr-1.5" /> Crear espacio</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSpaces.map((s, spaceIdx) => {
            const spacePoints = points
              .filter((p) => p.space_id === s.id)
              .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' }));
            const pointProgresses = spacePoints.map((p) => getPointProgress(p));
            const avgProgress = pointProgresses.length ? Math.round(pointProgresses.reduce((a, b) => a + b, 0) / pointProgresses.length) : 0;

            return (
              <div key={s.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{spacePoints.length} puntos · {avgProgress}% completado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2 bg-muted rounded-full">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${avgProgress}%` }} />
                    </div>
                    <button
                      onClick={() => { setEditSpace(s); setEditSpaceName(s.name); setEditSpaceType(s.space_type || "habitacion"); }}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteSpace(s.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {spacePoints.length > 0 && (
                  <div className="divide-y divide-border">
                    {spacePoints.map((pt, ptIdx) => {
                      const progress = getPointProgress(pt);
                      return (
                      <Link
                        key={pt.id}
                        to={`/checklist/${pt.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <DeviceIcon type={pt.device_type} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{pt.name}</p>
                            <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
                          </div>
                          {pt.technician && <p className="text-xs text-muted-foreground">{pt.technician}</p>}
                          <ProgressBar value={progress} className="mt-1.5 max-w-[140px]" />
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditPoint(pt); setEditPointName(pt.name); setEditPointType(pt.device_type); }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <StatusBadge status={pt.status} />
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Space Dialog */}
      <Dialog open={spaceDialog} onOpenChange={setSpaceDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Agregar espacio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nombre (ej: Habitación 201)" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} />
            <Select value={spaceType} onValueChange={setSpaceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="habitacion">Habitación</SelectItem>
                <SelectItem value="pasillo">Pasillo</SelectItem>
                <SelectItem value="sala">Sala</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addSpace} className="w-full">Crear espacio</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Point Dialog */}
      <Dialog open={pointDialog} onOpenChange={setPointDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Agregar punto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSpace || ""} onValueChange={setSelectedSpace}>
              <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
              <SelectContent>
                {sortedSpaces.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Nombre del punto (ej: ETH-01)" value={pointName} onChange={(e) => setPointName(e.target.value)} />
            <Select value={deviceType} onValueChange={setDeviceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ethernet">Ethernet</SelectItem>
                <SelectItem value="camara">Cámara CCTV</SelectItem>
                <SelectItem value="access_point">AP WiFi</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addPoint} className="w-full">Crear punto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Floor Name */}
      <Dialog open={editFloorName} onOpenChange={setEditFloorName}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar piso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={floorEditVal} onChange={(e) => setFloorEditVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveFloorName()} />
            <Button onClick={saveFloorName} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Space */}
      <Dialog open={!!editSpace} onOpenChange={(open) => { if (!open) setEditSpace(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar espacio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={editSpaceName} onChange={(e) => setEditSpaceName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditSpace()} />
            <Select value={editSpaceType} onValueChange={setEditSpaceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="habitacion">Habitación</SelectItem>
                <SelectItem value="pasillo">Pasillo</SelectItem>
                <SelectItem value="sala">Sala</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={saveEditSpace} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Point */}
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