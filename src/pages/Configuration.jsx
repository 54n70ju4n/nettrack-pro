import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Building2, Cable, Wifi, Camera, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Configuration() {
  const { toast } = useToast();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const f = await base44.entities.Floor.list("order", 100);
    setFloors(f);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateInitialStructure = async () => {
    if (floors.length > 0 && !confirm("Ya existen pisos. ¿Desea agregar la estructura inicial del edificio?")) return;
    setGenerating(true);

    const floorDefs = [
      { name: "Semisótano", order: 0 },
      { name: "Piso 1", order: 1 },
      ...Array.from({ length: 11 }, (_, i) => ({ name: `Piso ${i + 2}`, order: i + 2 })),
    ];

    const createdFloors = [];
    for (const fd of floorDefs) {
      const f = await base44.entities.Floor.create(fd);
      createdFloors.push(f);
    }

    // Pisos 2 al 9 with default rooms
    for (let pisoIdx = 2; pisoIdx <= 9; pisoIdx++) {
      const floor = createdFloors.find((f) => f.name === `Piso ${pisoIdx}`);
      if (!floor) continue;
      const prefix = pisoIdx;

      // Habitaciones 01-06
      for (let hab = 1; hab <= 6; hab++) {
        const habName = `Habitación ${prefix}0${hab}`;
        const s = await base44.entities.Space.create({ name: habName, floor_id: floor.id, space_type: "habitacion" });
        const ethCount = hab === 1 ? 3 : 2;
        for (let e = 1; e <= ethCount; e++) {
          await base44.entities.InstallationPoint.create({
            name: `ETH-${prefix}0${hab}-${e}`, floor_id: floor.id, space_id: s.id, device_type: "ethernet",
          });
        }
        await base44.entities.InstallationPoint.create({
          name: `AP-${prefix}0${hab}`, floor_id: floor.id, space_id: s.id, device_type: "access_point",
        });
      }

      // Sala de Experiencia
      const sala = await base44.entities.Space.create({ name: `Sala de Experiencia ${prefix}`, floor_id: floor.id, space_type: "sala" });
      await base44.entities.InstallationPoint.create({ name: `ETH-EXP-${prefix}-1`, floor_id: floor.id, space_id: sala.id, device_type: "ethernet" });
      await base44.entities.InstallationPoint.create({ name: `ETH-EXP-${prefix}-2`, floor_id: floor.id, space_id: sala.id, device_type: "ethernet" });
      await base44.entities.InstallationPoint.create({ name: `AP-EXP-${prefix}-1`, floor_id: floor.id, space_id: sala.id, device_type: "access_point" });

      // Pasillo
      const pasillo = await base44.entities.Space.create({ name: `Pasillo ${prefix}`, floor_id: floor.id, space_type: "pasillo" });
      for (let c = 1; c <= 4; c++) {
        await base44.entities.InstallationPoint.create({ name: `C${c}-${prefix}`, floor_id: floor.id, space_id: pasillo.id, device_type: "camara" });
      }
      for (let a = 1; a <= 2; a++) {
        await base44.entities.InstallationPoint.create({ name: `AP${a}-${prefix}`, floor_id: floor.id, space_id: pasillo.id, device_type: "access_point" });
      }
    }

    toast({ title: "Estructura generada", description: "Se crearon 13 pisos con sus espacios y puntos." });
    setGenerating(false);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra la estructura del edificio y ajustes del sistema</p>
      </div>

      {/* Quick setup */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Generar estructura inicial
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Crea automáticamente los 13 pisos (Semisótano + Pisos 1-12), con habitaciones, salas de experiencia y pasillos según la especificación para pisos 2 al 9.
            </p>
          </div>
          <Button onClick={generateInitialStructure} disabled={generating} size="sm">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {generating ? "Generando..." : "Generar"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Building2 className="w-4 h-4 text-blue-600" />} label="Pisos" value={floors.length} />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Pisos registrados</h3>
        {floors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay pisos aún. Use el botón "Generar" o cree pisos manualmente desde la sección Pisos.</p>
        ) : (
          <div className="divide-y divide-border">
            {floors.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-xs font-semibold">{f.order}</div>
                  <span className="text-sm font-medium">{f.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}