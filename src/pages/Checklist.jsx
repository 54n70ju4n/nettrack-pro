import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import DeviceIcon from "@/components/shared/DeviceIcon";
import ProgressBar from "@/components/shared/ProgressBar";
import { ArrowLeft, Loader2, Save, Camera, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getTemplate, FIELD_LABELS } from "@/lib/checklistTemplates";
import { getPointPhaseProgress, getEquipmentFieldPhase } from "@/lib/pointProgress";
import { usePoint, useFloor, useSpace, useTechnicians, useInvalidateData } from "@/lib/queries";
import { useAction } from "@/lib/useAction";
import DataError from "@/components/shared/DataError";

export default function Checklist() {
  const { pointId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidate = useInvalidateData();
  const run = useAction();
  const { data: point, isLoading, isError } = usePoint(pointId);
  const { data: floor } = useFloor(point?.floor_id);
  const { data: space } = useSpace(point?.space_id);
  const { data: technicians = [] } = useTechnicians();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => { if (point) setForm(point); }, [point]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    const ok = await run(async () => {
      const { id, created_date, updated_date, created_by_id, ...data } = form;
      await base44.entities.InstallationPoint.update(pointId, data);
      return true;
    });
    setSaving(false);
    if (ok) {
      invalidate();
      toast({ title: "Guardado", description: "Los cambios se guardaron correctamente." });
      navigate(-1);
    }
  };

  const uploadPhoto = (e) => run(async () => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("evidencia", [...(form.evidencia || []), file_url]);
  });

  const removePhoto = (url) => {
    update("evidencia", (form.evidencia || []).filter((u) => u !== url));
  };

  if (isError) {
    return <DataError onRetry={invalidate} />;
  }

  if (isLoading || !form) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const tpl = getTemplate(form.device_type);
  const phases = getPointPhaseProgress(form);

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

      {/* Status & Template info */}
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
            <Label className="text-xs mb-1.5 block">Plantilla</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">
              <DeviceIcon type={form.device_type} size="sm" />
              {tpl.label}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs mb-1.5 block">Técnico asignado</Label>
            <Select value={form.technician || "none"} onValueChange={(v) => update("technician", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {technicians.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs mb-1.5 block">Descripción</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Descripción del punto (ubicación, referencia, detalles)..."
              rows={2}
            />
          </div>
        </div>
      </Section>

      {/* Phase progress */}
      <Section title="Avance por fase">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhaseProgress label="Fase Piso" data={phases.piso} />
          <PhaseProgress label="Fase Rack" data={phases.rack} />
        </div>
      </Section>

      {/* Activities */}
      <Section title="Actividades" phase="piso">
        <div className="space-y-3">
          {tpl.activities.map((field) => (
            <div key={field} className="flex items-center justify-between">
              <CheckItem label={FIELD_LABELS[field]} checked={form[field]} onChange={(v) => update(field, v)} />
              {field === "act_ponchado" && tpl.showPonchadoType && (
                <Select value={form.ponchado_type || "na"} onValueChange={(v) => update("ponchado_type", v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="na">N/A</SelectItem>
                    <SelectItem value="jack">Jack (ETH)</SelectItem>
                    <SelectItem value="z_plug">Z-Plug</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
          {(tpl.customChecks || []).filter((c) => c.category === "activities").map((c) => (
            <CheckItem key={c.id} label={c.label} checked={form.custom_checks?.[c.id]} onChange={(v) => update("custom_checks", { ...(form.custom_checks || {}), [c.id]: v })} />
          ))}
        </div>
      </Section>

      {/* Accessories */}
      {(tpl.accessories.length > 0 || (tpl.customChecks || []).some((c) => c.category === "accessories")) && (
        <Section title="Accesorios" phase="piso">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tpl.accessories.map((field) => (
              <CheckItem key={field} label={FIELD_LABELS[field]} checked={form[field]} onChange={(v) => update(field, v)} />
            ))}
            {(tpl.customChecks || []).filter((c) => c.category === "accessories").map((c) => (
              <CheckItem key={c.id} label={c.label} checked={form.custom_checks?.[c.id]} onChange={(v) => update("custom_checks", { ...(form.custom_checks || {}), [c.id]: v })} />
            ))}
          </div>
        </Section>
      )}

      {/* Equipment (mixed phase: some items are Piso, some Rack) */}
      <Section title="Equipo">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tpl.equipment.map((field) => (
            <CheckItem key={field} label={FIELD_LABELS[field]} checked={form[field]} onChange={(v) => update(field, v)} phase={getEquipmentFieldPhase(field)} />
          ))}
          {(tpl.customChecks || []).filter((c) => c.category === "equipment").map((c) => (
            <CheckItem key={c.id} label={c.label} checked={form.custom_checks?.[c.id]} onChange={(v) => update("custom_checks", { ...(form.custom_checks || {}), [c.id]: v })} phase="rack" />
          ))}
        </div>
      </Section>

      {/* Network */}
      {tpl.showNetwork && (
      <Section title="Red" phase="rack">
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
      )}

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

const PHASE_BADGE = {
  piso: "bg-blue-50 text-blue-600",
  rack: "bg-purple-50 text-purple-600",
};

function Section({ title, phase, children }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
        {phase && (
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${PHASE_BADGE[phase]}`}>
            {phase === "piso" ? "Piso" : "Rack"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PhaseProgress({ label, data }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {data.total ? `${data.done}/${data.total} · ${data.pct}%` : "N/A"}
        </span>
      </div>
      <ProgressBar value={data.pct} />
    </div>
  );
}

function CheckItem({ label, checked, onChange, phase }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <Checkbox checked={!!checked} onCheckedChange={onChange} />
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
      {phase && (
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${PHASE_BADGE[phase]}`}>
          {phase === "piso" ? "Piso" : "Rack"}
        </span>
      )}
    </label>
  );
}