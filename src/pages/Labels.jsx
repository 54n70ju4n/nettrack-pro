import React, { useState, useMemo } from "react";
import { usePoints, useFloors, useSpaces, useInvalidateData } from "@/lib/queries";
import DataError from "@/components/shared/DataError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, Printer, Download, Tag, RotateCcw } from "lucide-react";
import DeviceIcon from "@/components/shared/DeviceIcon";
import {
  DEFAULT_CONFIG,
  SHEET_PRESETS,
  LABEL_FIELDS,
  computeLayout,
  buildLabelLines,
  expandPoints,
} from "@/lib/labelLayout";
import { downloadLabelsPdf, printLabelsPdf } from "@/lib/exportLabelsPdf";

// pt -> mm, used to keep preview font sizes proportional to the PDF output.
const PT_PER_MM = 72 / 25.4;

// --- Small labelled controls -------------------------------------------------

function NumField({ label, value, onChange, min = 0, max = 999, step = 1, suffix }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="h-9"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded-md border border-border cursor-pointer bg-white p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
      </div>
    </div>
  );
}

// --- Preview -----------------------------------------------------------------

function SheetPreview({ config, points, maps }) {
  const layout = useMemo(() => computeLayout(config), [config]);
  if (!layout.valid) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground text-center px-6">
        La cuadrícula no cabe en la hoja con estos márgenes/columnas. Ajusta los valores.
      </div>
    );
  }

  // Fit the whole page inside the preview box.
  const MAX_W = 400, MAX_H = 560;
  const pxPerMm = Math.min(MAX_W / layout.pageW, MAX_H / layout.pageH);
  const sequence = expandPoints(points, config.copies);
  const pageItems = sequence.slice(0, layout.perPage);
  const totalPages = Math.max(1, Math.ceil(sequence.length / layout.perPage));

  const mm = (v) => v * pxPerMm;

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto bg-white shadow-sm border border-border"
        style={{ width: mm(layout.pageW), height: mm(layout.pageH) }}
      >
        {pageItems.map((pt, i) => {
          const cell = layout.cells[i];
          const { name, meta } = buildLabelLines(pt, config, maps);
          const pad = Math.min(config.padding, layout.labelW / 2 - 0.5, layout.labelH / 2 - 0.5);
          return (
            <div
              key={i}
              className="absolute flex flex-col justify-center overflow-hidden"
              style={{
                left: mm(cell.x),
                top: mm(cell.y),
                width: mm(layout.labelW),
                height: mm(layout.labelH),
                padding: mm(pad),
                background: config.bgColor,
                border: config.showBorder ? `${Math.max(1, mm(config.borderWidth))}px solid ${config.borderColor}` : "none",
                borderRadius: mm(config.cornerRadius),
                textAlign: config.align,
                color: config.textColor,
                lineHeight: 1.15,
              }}
            >
              <div
                style={{
                  fontSize: mm(config.nameFontSize / PT_PER_MM),
                  fontWeight: config.bold ? 700 : 400,
                  wordBreak: "break-word",
                }}
              >
                {name}
              </div>
              {meta.length > 0 && (
                <div
                  style={{
                    fontSize: mm(config.metaFontSize / PT_PER_MM),
                    opacity: 0.7,
                    marginTop: mm(1),
                    wordBreak: "break-word",
                  }}
                >
                  {meta.join("  ·  ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {sequence.length} rótulo{sequence.length !== 1 ? "s" : ""} · {layout.perPage} por hoja · {totalPages} hoja{totalPages !== 1 ? "s" : ""}
        {totalPages > 1 && " (vista previa: hoja 1)"}
      </p>
    </div>
  );
}

// --- Page --------------------------------------------------------------------

export default function Labels() {
  const pointsQ = usePoints();
  const floorsQ = useFloors();
  const spacesQ = useSpaces();
  const points = pointsQ.data ?? [];
  const floors = floorsQ.data ?? [];
  const spaces = spacesQ.data ?? [];
  const loading = pointsQ.isLoading || floorsQ.isLoading || spacesQ.isLoading;
  const isError = pointsQ.isError || floorsQ.isError || spacesQ.isError;
  const invalidate = useInvalidateData();

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [filterFloor, setFilterFloor] = useState("all");

  const set = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const setField = (key, val) => setConfig((c) => ({ ...c, fields: { ...c.fields, [key]: val } }));

  const floorMap = useMemo(() => Object.fromEntries(floors.map((f) => [f.id, f.name])), [floors]);
  const spaceMap = useMemo(() => Object.fromEntries(spaces.map((s) => [s.id, s.name])), [spaces]);
  const maps = useMemo(() => ({ floorMap, spaceMap }), [floorMap, spaceMap]);

  const filtered = useMemo(
    () =>
      points.filter((p) => {
        if (search && !(p.name || "").toLowerCase().includes(search.toLowerCase())) return false;
        if (filterFloor !== "all" && p.floor_id !== filterFloor) return false;
        return true;
      }),
    [points, search, filterFloor]
  );

  const selectedPoints = useMemo(() => points.filter((p) => selected.has(p.id)), [points, selected]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAllFiltered = () => setSelected(new Set(filtered.map((p) => p.id)));
  const clearSelection = () => setSelected(new Set());
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const canPrint = selectedPoints.length > 0 && computeLayout(config).valid;
  const handlePrint = () => canPrint && printLabelsPdf(selectedPoints, config, maps);
  const handleDownload = () => canPrint && downloadLabelsPdf(selectedPoints, config, maps);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError) return <DataError onRetry={invalidate} />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Rótulos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Imprime etiquetas con los nombres de los puntos. {selectedPoints.length} seleccionado
            {selectedPoints.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={!canPrint} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          <Button onClick={handlePrint} disabled={!canPrint} size="sm">
            <Printer className="w-4 h-4 mr-1.5" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Left: selection + customization */}
        <div className="space-y-6">
          {/* Point selection */}
          <div className="bg-white rounded-xl border border-border">
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar punto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={filterFloor} onValueChange={setFilterFloor}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Piso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pisos</SelectItem>
                  {floors.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="px-4 py-2 flex items-center justify-between border-b border-border bg-muted/30">
              <button onClick={allFilteredSelected ? clearSelection : selectAllFiltered} className="text-xs font-medium text-primary hover:underline">
                {allFilteredSelected ? "Quitar selección" : `Seleccionar todos (${filtered.length})`}
              </button>
              {selected.size > 0 && (
                <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">
                  Limpiar ({selected.size})
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No se encontraron puntos</p>
              ) : (
                filtered.map((pt) => (
                  <label key={pt.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selected.has(pt.id)} onCheckedChange={() => toggle(pt.id)} />
                    <DeviceIcon type={pt.device_type} size="sm" />
                    <span className="flex-1 text-sm font-medium">{pt.name}</span>
                    <span className="text-xs text-muted-foreground">{floorMap[pt.floor_id] || ""}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Customization */}
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Personalización</h2>
              <button onClick={() => setConfig(DEFAULT_CONFIG)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Restablecer
              </button>
            </div>
            <Tabs defaultValue="hoja">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="hoja">Hoja</TabsTrigger>
                <TabsTrigger value="recuadro">Recuadro</TabsTrigger>
                <TabsTrigger value="texto">Texto</TabsTrigger>
                <TabsTrigger value="campos">Campos</TabsTrigger>
              </TabsList>

              {/* Hoja / sheet */}
              <TabsContent value="hoja" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tamaño de hoja</Label>
                    <Select value={config.sheet} onValueChange={(v) => set({ sheet: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SHEET_PRESETS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Orientación</Label>
                    <Select value={config.orientation} onValueChange={(v) => set({ orientation: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Vertical</SelectItem>
                        <SelectItem value="landscape">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {config.sheet === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="Ancho" value={config.customW} onChange={(v) => set({ customW: v })} min={20} max={2000} suffix="mm" />
                    <NumField label="Alto" value={config.customH} onChange={(v) => set({ customH: v })} min={20} max={2000} suffix="mm" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Columnas" value={config.columns} onChange={(v) => set({ columns: v })} min={1} max={20} />
                  <NumField label="Filas" value={config.rows} onChange={(v) => set({ rows: v })} min={1} max={40} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Separación horiz." value={config.gapX} onChange={(v) => set({ gapX: v })} min={0} max={50} step={0.5} suffix="mm" />
                  <NumField label="Separación vert." value={config.gapY} onChange={(v) => set({ gapY: v })} min={0} max={50} step={0.5} suffix="mm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Copias por punto" value={config.copies} onChange={(v) => set({ copies: v })} min={1} max={100} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <NumField label="M. sup." value={config.marginTop} onChange={(v) => set({ marginTop: v })} min={0} max={100} step={0.5} />
                  <NumField label="M. der." value={config.marginRight} onChange={(v) => set({ marginRight: v })} min={0} max={100} step={0.5} />
                  <NumField label="M. inf." value={config.marginBottom} onChange={(v) => set({ marginBottom: v })} min={0} max={100} step={0.5} />
                  <NumField label="M. izq." value={config.marginLeft} onChange={(v) => set({ marginLeft: v })} min={0} max={100} step={0.5} />
                </div>
              </TabsContent>

              {/* Recuadro / box */}
              <TabsContent value="recuadro" className="space-y-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={config.showBorder} onCheckedChange={(v) => set({ showBorder: !!v })} />
                  <span className="text-sm">Mostrar borde del recuadro</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Grosor del borde" value={config.borderWidth} onChange={(v) => set({ borderWidth: v })} min={0} max={5} step={0.1} suffix="mm" />
                  <NumField label="Redondeo esquinas" value={config.cornerRadius} onChange={(v) => set({ cornerRadius: v })} min={0} max={30} step={0.5} suffix="mm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Color del borde" value={config.borderColor} onChange={(v) => set({ borderColor: v })} />
                  <ColorField label="Color de fondo" value={config.bgColor} onChange={(v) => set({ bgColor: v })} />
                </div>
                <NumField label="Relleno interno" value={config.padding} onChange={(v) => set({ padding: v })} min={0} max={20} step={0.5} suffix="mm" />
              </TabsContent>

              {/* Texto */}
              <TabsContent value="texto" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Tamaño del nombre" value={config.nameFontSize} onChange={(v) => set({ nameFontSize: v })} min={4} max={48} step={0.5} suffix="pt" />
                  <NumField label="Tamaño de campos" value={config.metaFontSize} onChange={(v) => set({ metaFontSize: v })} min={4} max={24} step={0.5} suffix="pt" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Color del texto" value={config.textColor} onChange={(v) => set({ textColor: v })} />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Alineación</Label>
                    <Select value={config.align} onValueChange={(v) => set({ align: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Izquierda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Derecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={config.bold} onCheckedChange={(v) => set({ bold: !!v })} />
                  <span className="text-sm">Nombre en negrita</span>
                </label>
              </TabsContent>

              {/* Campos */}
              <TabsContent value="campos" className="space-y-3 pt-4">
                <p className="text-xs text-muted-foreground">Además del nombre, incluye en cada rótulo:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LABEL_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer py-1">
                      <Checkbox checked={!!config.fields[f.key]} onCheckedChange={(v) => setField(f.key, !!v)} />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-muted/40 rounded-xl border border-border p-4">
            <h2 className="font-semibold text-sm mb-3 text-center">Vista previa</h2>
            {selectedPoints.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground text-center px-6">
                Selecciona al menos un punto para ver la vista previa.
              </div>
            ) : (
              <SheetPreview config={config} points={selectedPoints} maps={maps} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
