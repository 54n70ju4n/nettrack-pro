import React from "react";
import { Settings, Users, UserCog, HardHat } from "lucide-react";

export default function Configuration() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Ajustes del sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">Opciones de configuración</h3>
            <p className="text-xs text-muted-foreground">Selecciona qué módulos te gustaría gestionar aquí</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <OptionCard icon={Users} title="Gestión de usuarios" description="Invitar y administrar miembros del equipo con roles admin o usuario" />
          <OptionCard icon={HardHat} title="Gestión de técnicos" description="Mantener un listado de técnicos disponibles para asignar a puntos" />
          <OptionCard icon={UserCog} title="Información del proyecto" description="Nombre del proyecto, cliente y datos generales" />
        </div>
      </div>
    </div>
  );
}

function OptionCard({ icon: Icon, title, description }) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mb-2">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}