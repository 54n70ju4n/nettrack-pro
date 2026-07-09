import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";

export default function Configuration() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const f = await base44.entities.Floor.list("order", 100);
    setFloors(f);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra la estructura del edificio y ajustes del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Building2 className="w-4 h-4 text-blue-600" />} label="Pisos" value={floors.length} />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Pisos registrados</h3>
        {floors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay pisos aún. Cree pisos manualmente desde la sección Pisos.</p>
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