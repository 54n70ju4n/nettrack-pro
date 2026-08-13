import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";

export const POINT_FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Lista" },
  { value: "checkbox", label: "Sí/No" },
];

// Editor for a project's point custom-field definitions. `fields` is the array
// of { id, label, type, options }; `onChange` receives the new array.
export default function PointFieldsEditor({ fields = [], onChange }) {
  const [newLabel, setNewLabel] = useState("");

  const update = (id, patch) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id) => onChange(fields.filter((f) => f.id !== id));
  const add = () => {
    if (!newLabel.trim()) return;
    onChange([...fields, { id: `cf_${Date.now()}`, label: newLabel.trim(), type: "text", options: [] }]);
    setNewLabel("");
  };

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div key={f.id} className="rounded-lg border border-border p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} placeholder="Etiqueta" className="h-8 flex-1" />
            <Select value={f.type} onValueChange={(v) => update(f.id, { type: v })}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POINT_FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => remove(f.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {f.type === "select" && (
            <OptionsEditor options={f.options || []} onChange={(opts) => update(f.id, { options: opts })} />
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nuevo campo de punto…"
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={add}><Plus className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

function OptionsEditor({ options, onChange }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v && !options.includes(v)) onChange([...options, v]);
    setVal("");
  };
  return (
    <div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {options.map((o) => (
            <span key={o} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              {o}
              <button type="button" onClick={() => onChange(options.filter((x) => x !== o))} className="text-muted-foreground hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Agregar opción…"
          className="h-7 text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={add}><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}
