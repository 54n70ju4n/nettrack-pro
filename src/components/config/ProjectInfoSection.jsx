import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ProjectInfoSection() {
  const { toast } = useToast();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ project_name: "", client: "", address: "", start_date: "", description: "" });

  const load = async () => {
    try {
      const list = await base44.entities.ProjectInfo.list("-created_date", 1);
      if (list.length > 0) {
        setInfo(list[0]);
        setForm({
          project_name: list[0].project_name || "",
          client: list[0].client || "",
          address: list[0].address || "",
          start_date: list[0].start_date || "",
          description: list[0].description || "",
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del proyecto" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.project_name.trim()) {
      toast({ variant: "destructive", title: "Campo requerido", description: "El nombre del proyecto es obligatorio" });
      return;
    }
    setSaving(true);
    try {
      if (info) {
        await base44.entities.ProjectInfo.update(info.id, form);
      } else {
        const created = await base44.entities.ProjectInfo.create(form);
        setInfo(created);
      }
      toast({ title: "Información guardada", description: "Los datos del proyecto se actualizaron correctamente" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo guardar" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm">Información del proyecto</h3>
          <p className="text-xs text-muted-foreground">Datos generales del proyecto de instalación</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="project_name">Nombre del proyecto *</Label>
          <Input id="project_name" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} placeholder="Ej: Hotel Continental" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client">Cliente</Label>
          <Input id="client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Nombre del cliente" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección del proyecto" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Fecha de inicio</Label>
          <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción general del proyecto" rows={3} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-5" size="sm">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar
      </Button>
    </div>
  );
}