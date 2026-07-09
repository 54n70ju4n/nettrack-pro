import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import DeviceIcon from "@/components/shared/DeviceIcon";
import { ArrowLeft, Loader2, Save, Camera, X, ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Checklist() {
  const { pointId } = useParams();
  const { toast } = useToast();
  const [point, setPoint] = useState(null);
  const [floor, setFloor] = useState(null);
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    base44.entities.InstallationPoint.get(pointId).then(async (p) => {
      setPoint(p);
      setForm(p);
      const [f, s] = await Promise.all([
        base44.entities.Floor.get(p.floor_id),
        base44.entities.Space.get(p.space_id),
      ]);
      setFloor(f);
      setSpace(s);
      setLoading(false);
    });
  }, [pointId]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by_id, ...data } = form;
    await base44.entities.InstallationPoint.update(pointId, data);
    toast({ title: "Guardado", description: "Los cambios se guardaron correctamente." });
    setSaving(false);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("evidencia", [...(form.evidencia || []), file_url]);
  };

  const removePhoto = (url) => {
    update("evidencia", (form.evidencia || []).filter((u) => u !== url));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const isEth = form.device_type === "ethernet";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/pisos/${point.floor_id}`} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <DeviceIcon type={form.device_type} />
            <h1 className="text-xl font-heading font-bold tracking-tight">{form.name}</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{floor?.name} · {space?.name}</p>
        </div>
        <StatusBadge status={form.status} />
      </div>

      {/* Status & Technician */}
      <Section title="General">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">Estado</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="con_observaciones">Con observaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Técnico</Label>
            <Input value={form.technician || ""} onChange={(e) => update("technician", e.target.value)} placeholder="Nombre del técnico" />
          </div>
        </div>
      </Section>

      {/* Activities */}
      <Section title="Actividades">
        <div className="space-y-3">
          <CheckItem label="Perforación" checked={form.act_perforacion} onChange={(v) => update("act_perforacion", v)} />
          <CheckItem label="Pesca del cable" checked={form.act_pesca_cable} onChange={(v) => update("act_pesca_cable", v)} />
          <div className="flex items-center justify-between">
            <CheckItem label="Ponchado" checked={form.act_ponchado} onChange={(v) => update("act_ponchado", v)} />
            <Select value={form.ponchado_type || "na"} onValueChange={(v) => update("ponchado_type", v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="na">N/A</SelectItem>
                <SelectItem value="jack">Jack (ETH)</SelectItem>
                <SelectItem value="z_plug">Z-Plug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Accessories (Ethernet only) */}
      {isEth && (
        <Section title="Accesorios Ethernet">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckItem label="Face Plate" checked={form.acc_face_plate} onChange={(v) => update("acc_face_plate", v)} />
            <CheckItem label="Tapa Face Plate" checked={form.acc_tapa_face_plate} onChange={(v) => update("acc_tapa_face_plate", v)} />
            <CheckItem label="Tornillos" checked={form.acc_tornillos} onChange={(v) => update("acc_tornillos", v)} />
            <CheckItem label="Rótulo" checked={form.acc_rotulo} onChange={(v) => update("acc_rotulo", v)} />
            <CheckItem label="Protector" checked={form.acc_protector} onChange={(v) => update("acc_protector", v)} />
          </div>
        </Section>
      )}

      {/* Equipment */}
      <Section title="Equipo">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CheckItem label="Equipo instalado" checked={form.equipo_instalado} onChange={(v) => update("equipo_instalado", v)} />
          <CheckItem label="Equipo configurado" checked={form.equipo_configurado} onChange={(v) => update("equipo_configurado", v)} />
          <CheckItem label="Equipo probado" checked={form.equipo_probado} onChange={(v) => update("equipo_probado", v)} />
          <CheckItem label="Funcionando correctamente" checked={form.funcionando} onChange={(v) => update("funcionando", v)} />
          <CheckItem label="Ponchado e identificado en rack" checked={form.ponchado_rack} onChange={(v) => update("ponchado_rack", v)} />
        </div>
      </Section>

      {/* Network */}
      <Section title="Red">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">Puerto Patch Panel</Label>
            <Input value={form.puerto_patch_panel || ""} onChange={(e) => update("puerto_patch_panel", e.target.value)} placeholder="Ej: PP1-24" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Puerto Switch</Label>
            <Input value={form.puerto_switch || ""} onChange={(e) => update("puerto_switch", e.target.value)} placeholder="Ej: SW1-GE0/1" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">VLAN</Label>
            <Input value={form.vlan || ""} onChange={(e) => update("vlan", e.target.value)} placeholder="Ej: VLAN 100" />
          </div>
        </div>
      </Section>

      {/* Observations */}
      <Section title="Observaciones">
        <Textarea
          value={form.observaciones || ""}
          onChange={(e) => update("observaciones", e.target.value)}
          placeholder="Notas adicionales sobre la instalación..."
          rows={3}
        />
      </Section>

      {/* Evidence */}
      <Section title="Evidencia fotográfica">
        <div className="flex flex-wrap gap-3">
          {(form.evidencia || []).map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
              <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">Agregar</span>
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </label>
        </div>
      </Section>

      {/* Save */}
      <div className="sticky bottom-4">
        <Button onClick={save} disabled={saving} className="w-full shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 md:p-5">
      <h3 className="font-heading font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <Checkbox checked={!!checked} onCheckedChange={onChange} />
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}