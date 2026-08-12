import { getTemplate, FIELD_LABELS } from "./checklistTemplates";
import {
  getPointProgress,
  getPointPhaseProgress,
  aggregatePhaseProgress,
  getEquipmentFieldPhase,
  hasObservations,
} from "./pointProgress";
import { sortItems } from "./ordering";
import {
  C, STATUS_STYLE, STATUS_ORDER, DEVICE_STYLE, PHASE_STYLE,
  fill, stroke, panel, line,
  pill, pillWidth, bar, check, donut, ring, kpiCard, field, fieldBlock, fieldBlockHeight,
  loadPhoto, photoCell,
} from "./pdfKit";

// jsPDF (and its transitive deps) is ~580 kB, so load it on demand the first
// time the user actually exports, instead of on every page that can export.
async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF;
}

const MARGIN = 40;
const FOOTER = 44; // reserved bottom strip for the page number
const GAP = 9; // vertical gap between cards
const CARD_PAD = 32; // card chrome: title band above the body + bottom padding

const PONCHADO_LABELS = { na: "N/A", jack: "Jack (ETH)", z_plug: "Z-Plug" };

const DEVICE_LABELS = { ethernet: "Ethernet", camara: "Cámaras", access_point: "AP WiFi" };

function formatToday() {
  return new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

// --- Report scaffolding ----------------------------------------------------

function createReport(doc, title) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const r = {
    doc,
    pageW,
    pageH,
    margin: MARGIN,
    contentW: pageW - MARGIN * 2,
    bottom: pageH - FOOTER,
    y: MARGIN,
    title,
    crumb: "",
    started: false,
  };
  r.newPage = () => {
    doc.addPage();
    r.started = true;
    r.y = MARGIN;
    drawPageTop(r);
  };
  // Starts a fresh page unless the document is still on its untouched first one.
  r.startPage = () => {
    if (r.started) doc.addPage();
    r.started = true;
    r.y = MARGIN;
    drawPageTop(r);
  };
  r.ensure = (h) => {
    if (r.y + h > r.bottom) r.newPage();
  };
  return r;
}

// Slim running head: brand on the left, current floor/space on the right.
function drawPageTop(r) {
  const { doc, margin, pageW, contentW } = r;
  line(doc, "NETTRACK PRO", margin, margin - 14, { size: 7, style: "bold", color: C.primary, charSpace: 1.2 });
  if (r.crumb) {
    line(doc, r.crumb, pageW - margin, margin - 14, { size: 7, color: C.faint, align: "right", maxW: contentW * 0.6 });
  }
  stroke(doc, C.border);
  doc.setLineWidth(0.6);
  doc.line(margin, margin - 4, pageW - margin, margin - 4);
  r.y = margin + 10;
}

// Stamped once at the end so the page count is known.
function stampFooters(r) {
  const { doc, margin, pageW, pageH } = r;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    stroke(doc, C.hairline);
    doc.setLineWidth(0.6);
    doc.line(margin, pageH - 32, pageW - margin, pageH - 32);
    line(doc, r.title, margin, pageH - 24, { size: 7, color: C.faint, maxW: r.contentW - 90 });
    line(doc, `Página ${i} de ${total}`, pageW - margin, pageH - 24, { size: 7, color: C.faint, align: "right" });
  }
  doc.setPage(total);
}

// Cover banner: brand block in the primary color with the report identity.
function drawCover(r, { kicker, title, subtitle }) {
  const { doc, margin, pageW } = r;
  const bandH = 124;
  fill(doc, C.primary);
  doc.rect(0, 0, pageW, bandH, "F");
  // Subtle depth, without relying on transparency support.
  fill(doc, C.primaryDark);
  doc.circle(pageW - 66, 40, 50, "F");
  doc.circle(pageW - 28, 104, 20, "F");

  line(doc, "NETTRACK PRO", margin, 30, { size: 7.5, style: "bold", color: C.white, charSpace: 1.6 });
  line(doc, kicker, pageW - margin, 30, { size: 7.5, color: C.primarySoft, align: "right" });
  line(doc, title, margin, 48, { size: 23, style: "bold", color: C.white, maxW: pageW - margin * 2 - 90 });
  line(doc, subtitle, margin, 86, { size: 9.5, color: C.primarySoft, maxW: pageW - margin * 2 - 60 });

  r.started = true;
  r.y = bandH + 22;
}

// Card frame with a bold title (+ optional phase badge). Returns the body box.
function openCard(r, bodyH, title, phase) {
  const height = bodyH + CARD_PAD;
  r.ensure(height);
  const { doc, margin, contentW } = r;
  panel(doc, margin, r.y, contentW, height, { bg: C.white, border: C.border });
  const tx = line(doc, title, margin + 14, r.y + 10, { size: 9, style: "bold", color: C.ink });
  if (phase) {
    const s = PHASE_STYLE[phase];
    pill(doc, tx + 8, r.y + 8, s.label.toUpperCase(), { fg: s.fg, bg: s.bg, size: 6.5, h: 11, padX: 5 });
  }
  return { x: margin + 14, y: r.y + 26, w: contentW - 28, top: r.y, height };
}

function closeCard(r, card) {
  r.y = card.top + card.height + GAP;
}

// Card of repeating rows that can span pages, continuing with a "(cont.)" title.
function drawRowsCard(r, title, items, rowH, drawRow, { header, headerH = 0 } = {}) {
  let index = 0;
  let first = true;
  while (index < items.length) {
    const avail = r.bottom - r.y - CARD_PAD - headerH;
    const fits = Math.floor(avail / rowH);
    const remaining = items.length - index;
    const atPageTop = r.y <= MARGIN + 10;
    // Don't leave an orphan card holding one or two rows at the foot of a page,
    // unless we are already at the top of a fresh page and can't do better.
    if (fits < Math.min(remaining, 3) && !(atPageTop && fits >= 1)) {
      r.newPage();
      continue;
    }
    const chunk = items.slice(index, index + Math.max(1, fits));
    const bodyH = headerH + chunk.length * rowH;
    const card = openCard(r, bodyH, first ? title : `${title} (cont.)`);
    let y = card.y;
    if (header) {
      header(card.x, y, card.w);
      y += headerH;
    }
    for (const item of chunk) {
      drawRow(item, card.x, y, card.w);
      y += rowH;
    }
    closeCard(r, card);
    index += chunk.length;
    first = false;
  }
}

// --- Aggregations ----------------------------------------------------------

function computeStats(points) {
  const byStatus = { pendiente: 0, en_proceso: 0, finalizado: 0, con_observaciones: 0 };
  for (const p of points) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  const total = points.length;
  return {
    total,
    byStatus,
    finalizados: byStatus.finalizado,
    conObs: points.filter(hasObservations).length,
    pct: total ? points.reduce((sum, p) => sum + getPointProgress(p), 0) / total : 0,
  };
}

// Progress rows for a set of containers (spaces or floors).
function groupRows(containers, points, key) {
  return containers
    .map((c) => {
      const own = points.filter((p) => p[key] === c.id);
      return {
        id: c.id,
        name: c.name,
        total: own.length,
        done: own.filter((p) => p.status === "finalizado").length,
        pct: own.length ? Math.round(own.reduce((sum, p) => sum + getPointProgress(p), 0) / own.length) : 0,
      };
    })
    .filter((row) => row.total > 0);
}

function deviceRows(points) {
  return Object.entries(DEVICE_LABELS)
    .map(([type, name]) => {
      const own = points.filter((p) => p.device_type === type);
      return {
        name,
        total: own.length,
        done: own.filter((p) => p.status === "finalizado").length,
        pct: own.length ? Math.round(own.reduce((sum, p) => sum + getPointProgress(p), 0) / own.length) : 0,
      };
    })
    .filter((row) => row.total > 0);
}

// --- Summary blocks --------------------------------------------------------

// Hero: overall progress ring + status distribution donut with legend.
function drawHero(r, stats) {
  const { doc, margin, contentW } = r;
  const h = 132;
  r.ensure(h);
  const leftW = Math.round(contentW * 0.37);
  const rightX = margin + leftW + GAP;
  const rightW = contentW - leftW - GAP;

  panel(doc, margin, r.y, leftW, h, { bg: C.white, border: C.border });
  line(doc, "Avance general", margin + 14, r.y + 12, { size: 9, style: "bold", color: C.ink });
  ring(doc, margin + leftW / 2, r.y + 72, 38, 11, stats.pct, { labelSize: 16 });
  line(doc, `${stats.finalizados} de ${stats.total} puntos finalizados`, margin + leftW / 2, r.y + h - 16, {
    size: 7.5, color: C.muted, align: "center", maxW: leftW - 20,
  });

  panel(doc, rightX, r.y, rightW, h, { bg: C.white, border: C.border });
  line(doc, "Distribución por estado", rightX + 14, r.y + 12, { size: 9, style: "bold", color: C.ink });
  const segments = STATUS_ORDER
    .map((key) => ({ key, value: stats.byStatus[key] || 0, color: STATUS_STYLE[key].dot }))
    .filter((s) => s.value > 0);
  const cx = rightX + 62;
  const cy = r.y + 74;
  donut(doc, cx, cy, 36, 21, segments);
  line(doc, String(stats.total), cx, cy - 4, { size: 13, style: "bold", color: C.ink, align: "center", baseline: "middle" });
  line(doc, "puntos", cx, cy + 8, { size: 6.5, color: C.muted, align: "center", baseline: "middle" });

  const legendX = rightX + 112;
  const legendW = rightW - 112 - 14;
  let ly = r.y + 36;
  for (const key of STATUS_ORDER) {
    const s = STATUS_STYLE[key];
    const value = stats.byStatus[key] || 0;
    fill(doc, s.dot);
    doc.roundedRect(legendX, ly + 1.5, 6, 6, 2, 2, "F");
    line(doc, s.label, legendX + 12, ly, { size: 8, color: C.text, maxW: legendW - 60 });
    const share = stats.total ? Math.round((value / stats.total) * 100) : 0;
    line(doc, `${value}  ·  ${share}%`, legendX + legendW, ly, { size: 8, style: "bold", color: C.ink, align: "right" });
    ly += 19;
  }
  r.y += h + GAP;
}

function drawKpiRow(r, stats) {
  const { doc, margin, contentW } = r;
  const h = 58;
  r.ensure(h);
  const gap = 10;
  const w = (contentW - gap * 3) / 4;
  const cards = [
    { label: "Finalizados", value: stats.finalizados, sub: `de ${stats.total}`, color: C.green },
    { label: "En proceso", value: stats.byStatus.en_proceso, color: C.amber },
    { label: "Pendientes", value: stats.byStatus.pendiente, color: C.slate },
    { label: "Con observaciones", value: stats.conObs, color: C.red },
  ];
  cards.forEach((c, i) => kpiCard(doc, margin + i * (w + gap), r.y, w, h, c));
  r.y += h + GAP;
}

const PHASE_BOX_H = 46;

function phaseBox(doc, x, y, w, { label, data, style }) {
  panel(doc, x, y, w, PHASE_BOX_H, { bg: C.soft, border: C.hairline, r: 6 });
  ring(doc, x + 29, y + PHASE_BOX_H / 2, 16, 4.5, data.pct, { color: style.dot, labelSize: 7.5 });
  const tx = x + 54;
  const tw = w - 54 - 12;
  fill(doc, style.dot);
  doc.circle(tx + 3, y + 13, 3, "F");
  line(doc, label, tx + 10, y + 9, { size: 8.5, style: "bold", color: C.ink, maxW: tw - 10 });
  const pending = Math.max(0, data.total - data.done);
  line(doc, data.total ? `${data.done}/${data.total} ítems · faltan ${pending}` : "Sin ítems", tx, y + 21, {
    size: 7, color: C.muted, maxW: tw,
  });
  bar(doc, tx, y + 33, tw, data.pct, { color: style.dot });
}

function drawPhaseCard(r, phases) {
  const card = openCard(r, PHASE_BOX_H, "Avance por fase");
  const w = (card.w - GAP) / 2;
  phaseBox(r.doc, card.x, card.y, w, { label: "Fase Piso", data: phases.piso, style: PHASE_STYLE.piso });
  phaseBox(r.doc, card.x + w + GAP, card.y, w, { label: "Fase Rack", data: phases.rack, style: PHASE_STYLE.rack });
  closeCard(r, card);
}

function drawProgressRows(r, title, rows) {
  if (rows.length === 0) return;
  drawRowsCard(r, title, rows, 26, (row, x, y, w) => {
    const { doc } = r;
    line(doc, row.name, x, y, { size: 8.5, style: "bold", color: C.ink, maxW: w - 110 });
    line(doc, `${row.done}/${row.total} · ${row.pct}%`, x + w, y, { size: 7.5, color: C.muted, align: "right" });
    bar(doc, x, y + 13, w, row.pct, { h: 4 });
  });
}

// Compact index of every point in the scope, mirroring the list views.
function drawPointIndex(r, rows) {
  if (rows.length === 0) return;
  const { doc } = r;
  const cols = (w) => ({ name: w * 0.34, space: w * 0.26, status: w * 0.22, progress: w * 0.18 });
  drawRowsCard(
    r,
    "Detalle de puntos",
    rows,
    17,
    (row, x, y, w) => {
      const c = cols(w);
      const s = STATUS_STYLE[row.status] || STATUS_STYLE.pendiente;
      line(doc, row.name, x, y + 2, { size: 8, style: "bold", color: C.ink, maxW: c.name - 8 });
      line(doc, row.space, x + c.name, y + 2, { size: 7.5, color: C.muted, maxW: c.space - 8 });
      fill(doc, s.dot);
      doc.circle(x + c.name + c.space + 3, y + 6, 2.6, "F");
      line(doc, s.label, x + c.name + c.space + 10, y + 2, { size: 7.5, color: s.fg, maxW: c.status - 18 });
      bar(doc, x + w - 74, y + 4.5, 42, row.progress, { h: 4 });
      line(doc, `${row.progress}%`, x + w, y + 2, { size: 7.5, style: "bold", color: C.ink, align: "right" });
      stroke(doc, C.hairline);
      doc.setLineWidth(0.5);
      doc.line(x, y + 15, x + w, y + 15);
    },
    {
      headerH: 16,
      header: (x, y, w) => {
        const c = cols(w);
        const opts = { size: 6.5, style: "bold", color: C.faint, charSpace: 0.6 };
        line(doc, "PUNTO", x, y, opts);
        line(doc, "ESPACIO", x + c.name, y, opts);
        line(doc, "ESTADO", x + c.name + c.space, y, opts);
        line(doc, "AVANCE", x + w, y, { ...opts, align: "right" });
        stroke(doc, C.border);
        doc.setLineWidth(0.6);
        doc.line(x, y + 11, x + w, y + 11);
      },
    }
  );
}

// Banner that introduces a floor inside the project report.
function drawFloorBanner(r, floor, spaces, points) {
  const { doc, margin, contentW } = r;
  const h = 54;
  r.ensure(h + 6);
  panel(doc, margin, r.y, contentW, h, { bg: C.primarySoft, border: C.primarySoft });
  line(doc, floor?.name || "Piso", margin + 16, r.y + 13, { size: 14, style: "bold", color: C.primaryDark, maxW: contentW - 160 });
  line(doc, `${spaces.length} espacios · ${points.length} puntos`, margin + 16, r.y + 34, {
    size: 8, color: C.primaryDark, maxW: contentW - 160,
  });
  const pct = points.length ? Math.round(points.reduce((sum, p) => sum + getPointProgress(p), 0) / points.length) : 0;
  line(doc, `${pct}%`, margin + contentW - 16, r.y + 14, { size: 13, style: "bold", color: C.primaryDark, align: "right" });
  bar(doc, margin + contentW - 116, r.y + 36, 100, pct, { h: 5, color: C.primary, track: C.white });
  r.y += h + GAP;
}

// --- Point sheet (mirrors the checklist view of a single point) -------------

function drawSheetHeader(r, pt, { floorName, spaceName, tpl }) {
  const { doc, margin, contentW } = r;
  const status = STATUS_STYLE[pt.status] || STATUS_STYLE.pendiente;
  const device = DEVICE_STYLE[pt.device_type] || DEVICE_STYLE.ethernet;
  const top = r.y;

  const statusW = pillWidth(doc, status.label, { size: 8, padX: 8, dot: true });
  pill(doc, margin + contentW - statusW, top, status.label, {
    fg: status.fg, bg: status.bg, size: 8, h: 17, padX: 8, dot: status.dot,
  });
  line(doc, pt.name || "", margin, top - 1, { size: 15, style: "bold", color: C.ink, maxW: contentW - statusW - 14 });

  let x = margin;
  x += pill(doc, x, top + 24, tpl.label || "", { fg: device.fg, bg: device.bg, size: 7.5, h: 14, padX: 7 }) + 6;
  const progress = getPointProgress(pt);
  x += pill(doc, x, top + 24, `Avance ${progress}%`, { fg: C.primaryDark, bg: C.primarySoft, size: 7.5, h: 14, padX: 7 }) + 8;
  line(doc, `${floorName} · ${spaceName}`, x, top + 28, { size: 8, color: C.muted, maxW: margin + contentW - x });

  stroke(doc, C.border);
  doc.setLineWidth(0.6);
  doc.line(margin, top + 42, margin + contentW, top + 42);
  r.y = top + 50;
}

const FIELD_ROW = 31; // label + box + gap, matching pdfKit's field()

function drawGeneralCard(r, pt, { floorName, spaceName, tpl }) {
  const { doc } = r;
  const status = STATUS_STYLE[pt.status] || STATUS_STYLE.pendiente;
  const innerW = r.contentW - 28;
  const descH = fieldBlockHeight(doc, innerW, pt.description, { placeholder: "Sin descripción" });
  const bodyH = FIELD_ROW * 3 + descH; // three single-line rows + the description block
  const card = openCard(r, bodyH, "General");
  const half = (card.w - GAP) / 2;
  let y = card.y;
  field(doc, card.x, y, half, "Piso", floorName);
  field(doc, card.x + half + GAP, y, half, "Espacio", spaceName);
  y += FIELD_ROW;
  field(doc, card.x, y, half, "Estado", status.label, { color: status.fg });
  field(doc, card.x + half + GAP, y, half, "Plantilla", tpl.label);
  y += FIELD_ROW;
  field(doc, card.x, y, card.w, "Técnico asignado", pt.technician, { placeholder: "Sin asignar" });
  y += FIELD_ROW;
  fieldBlock(doc, card.x, y, card.w, "Descripción", pt.description, { placeholder: "Sin descripción" });
  closeCard(r, card);
}

const ROW_H = 14;

// One checklist item per row, single column (matches the Actividades layout).
function drawActivitiesCard(r, pt, tpl) {
  const { doc } = r;
  const custom = (tpl.customChecks || []).filter((c) => c.category === "activities");
  const items = [
    ...tpl.activities.map((f) => ({ label: FIELD_LABELS[f] || f, checked: !!pt[f], field: f })),
    ...custom.map((c) => ({ label: c.label, checked: !!pt.custom_checks?.[c.id] })),
  ];
  if (items.length === 0) return;
  const card = openCard(r, items.length * ROW_H, "Actividades", "piso");
  let y = card.y;
  for (const item of items) {
    const showPonchado = item.field === "act_ponchado" && tpl.showPonchadoType;
    const badge = showPonchado ? PONCHADO_LABELS[pt.ponchado_type || "na"] : null;
    const badgeW = badge ? pillWidth(doc, badge, { size: 6.5, padX: 5 }) : 0;
    check(doc, card.x, y, item.label, item.checked, { maxW: card.w - badgeW - 10 });
    if (badge) {
      pill(doc, card.x + card.w - badgeW, y - 0.5, badge, { fg: C.text, bg: C.slateSoft, size: 6.5, h: 11, padX: 5 });
    }
    y += ROW_H;
  }
  closeCard(r, card);
}

// Two-column checklist grid, optionally badging each item with its phase.
function drawChecklistGridCard(r, title, items, { phase, itemPhase } = {}) {
  if (items.length === 0) return;
  const { doc } = r;
  const rows = Math.ceil(items.length / 2);
  const card = openCard(r, rows * ROW_H, title, phase);
  const colW = (card.w - GAP) / 2;
  items.forEach((item, i) => {
    const x = card.x + (i % 2) * (colW + GAP);
    const y = card.y + Math.floor(i / 2) * ROW_H;
    const ph = itemPhase ? PHASE_STYLE[itemPhase(item)] : null;
    const badge = ph ? ph.label.toUpperCase() : null;
    const badgeW = badge ? pillWidth(doc, badge, { size: 6, padX: 4 }) : 0;
    const endX = check(doc, x, y, item.label, item.checked, { maxW: colW - badgeW - 8 });
    if (badge) pill(doc, endX + 6, y, badge, { fg: ph.fg, bg: ph.bg, size: 6, h: 10, padX: 4 });
  });
  closeCard(r, card);
}

function drawNetworkCard(r, pt) {
  const { doc } = r;
  const card = openCard(r, 27, "Red", "rack");
  const w = (card.w - GAP * 2) / 3;
  field(doc, card.x, card.y, w, "Puerto Patch Panel", pt.puerto_patch_panel);
  field(doc, card.x + w + GAP, card.y, w, "Puerto Switch", pt.puerto_switch);
  field(doc, card.x + (w + GAP) * 2, card.y, w, "VLAN", pt.vlan);
  closeCard(r, card);
}

function drawObservationsCard(r, pt) {
  const { doc } = r;
  const hasText = !!pt.observaciones?.trim();
  const bodyH = fieldBlockHeight(doc, r.contentW - 28, pt.observaciones, { label: false, minH: 26, placeholder: "Sin observaciones" });
  const card = openCard(r, bodyH, "Observaciones");
  fieldBlock(doc, card.x, card.y, card.w, null, pt.observaciones, {
    minH: 26,
    placeholder: "Sin observaciones",
    color: hasText ? C.red : C.faint,
    bg: hasText ? C.redSoft : C.soft,
  });
  closeCard(r, card);
}

function drawEvidenceCard(r, photos) {
  const { doc } = r;
  if (photos.length === 0) {
    const card = openCard(r, 26, "Evidencia fotográfica");
    panel(doc, card.x, card.y, card.w, 26, { bg: C.soft, border: C.border, r: 5 });
    line(doc, "Sin evidencia fotográfica", card.x + 8, card.y + 13, { size: 8, color: C.faint, baseline: "middle" });
    closeCard(r, card);
    return;
  }
  // Chunked into rows so a point with many photos spills onto further pages
  // instead of overflowing off the sheet.
  const perRow = 5;
  const gap = 8;
  const size = (r.contentW - 28 - gap * (perRow - 1)) / perRow;
  const rows = [];
  for (let i = 0; i < photos.length; i += perRow) {
    rows.push(photos.slice(i, i + perRow).map((photo, j) => ({ photo, index: i + j })));
  }
  drawRowsCard(r, "Evidencia fotográfica", rows, size + 22, (row, x, y) => {
    for (const cell of row) {
      photoCell(doc, x + (cell.index % perRow) * (size + gap), y, size, cell.photo, `Foto ${cell.index + 1}`);
    }
  });
}

// Full sheet for one point: same sections, order and wording as the web view.
async function drawPointSheet(r, pt, { floorName, spaceName }) {
  const tpl = getTemplate(pt.device_type);
  const photos = await Promise.all((pt.evidencia || []).map((url) => loadPhoto(url)));

  r.crumb = `${floorName} · ${spaceName} · ${pt.name || ""}`;
  r.startPage();
  drawSheetHeader(r, pt, { floorName, spaceName, tpl });
  drawGeneralCard(r, pt, { floorName, spaceName, tpl });
  drawPhaseCard(r, getPointPhaseProgress(pt));
  drawActivitiesCard(r, pt, tpl);

  const customBy = (category) => (tpl.customChecks || []).filter((c) => c.category === category);
  const accessories = [
    ...tpl.accessories.map((f) => ({ label: FIELD_LABELS[f] || f, checked: !!pt[f] })),
    ...customBy("accessories").map((c) => ({ label: c.label, checked: !!pt.custom_checks?.[c.id] })),
  ];
  drawChecklistGridCard(r, "Accesorios", accessories, { phase: "piso" });

  const equipment = [
    ...tpl.equipment.map((f) => ({ label: FIELD_LABELS[f] || f, checked: !!pt[f], phase: getEquipmentFieldPhase(f) })),
    ...customBy("equipment").map((c) => ({ label: c.label, checked: !!pt.custom_checks?.[c.id], phase: "rack" })),
  ];
  drawChecklistGridCard(r, "Equipo", equipment, { itemPhase: (item) => item.phase });

  if (tpl.showNetwork) drawNetworkCard(r, pt);
  drawObservationsCard(r, pt);
  drawEvidenceCard(r, photos);
  r.crumb = "";
}

// --- Scope rendering -------------------------------------------------------

// Summary + per-point sheets for one floor. `showBanner` adds the floor headline
// used by the project report, where several floors follow one another;
// `withDevices` adds the per-device breakdown the project summary already shows.
async function renderFloorScope(r, floor, spaces, points, { showBanner = false, withDevices = false } = {}) {
  const sortedSpaces = sortItems(spaces, "manual");
  const spaceNames = Object.fromEntries(spaces.map((s) => [s.id, s.name]));
  const ordered = sortedSpaces.flatMap((s) => sortItems(points.filter((p) => p.space_id === s.id), "manual"));
  // Points whose space was removed still belong in the report.
  const orphans = sortItems(points.filter((p) => !spaceNames[p.space_id]), "manual");
  const allPoints = [...ordered, ...orphans];

  if (showBanner) {
    r.startPage();
    drawFloorBanner(r, floor, spaces, points);
  }
  drawPhaseCard(r, aggregatePhaseProgress(points));
  drawProgressRows(r, "Avance por espacio", groupRows(sortedSpaces, points, "space_id"));
  if (withDevices) drawProgressRows(r, "Avance por tipo de dispositivo", deviceRows(points));
  drawPointIndex(
    r,
    allPoints.map((p) => ({
      name: p.name || "",
      space: spaceNames[p.space_id] || "Sin espacio",
      status: p.status,
      progress: getPointProgress(p),
    }))
  );

  for (const pt of allPoints) {
    await drawPointSheet(r, pt, {
      floorName: floor?.name || "Piso",
      spaceName: spaceNames[pt.space_id] || "Sin espacio",
    });
  }
}

// --- Public API ------------------------------------------------------------
//
// The build* functions return the jsPDF document (handy for tests/previews);
// the export* wrappers are what the UI calls and trigger the download.

export async function buildFloorDoc(floor, spaces, points) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const floorName = floor?.name || "Piso";
  const r = createReport(doc, `NetTrack Pro · Reporte de piso · ${floorName}`);

  drawCover(r, {
    kicker: "Reporte de piso",
    title: floorName,
    subtitle: `${spaces.length} espacios · ${points.length} puntos · Generado el ${formatToday()}`,
  });
  const stats = computeStats(points);
  drawHero(r, stats);
  drawKpiRow(r, stats);
  await renderFloorScope(r, floor, spaces, points, { withDevices: true });

  stampFooters(r);
  return doc;
}

export async function buildProjectDoc(floors, spaces, points) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const r = createReport(doc, "NetTrack Pro · Reporte de proyecto");

  drawCover(r, {
    kicker: "Reporte de proyecto",
    title: "Instalación de red",
    subtitle: `${floors.length} pisos · ${spaces.length} espacios · ${points.length} puntos · Generado el ${formatToday()}`,
  });
  const stats = computeStats(points);
  drawHero(r, stats);
  drawKpiRow(r, stats);
  drawPhaseCard(r, aggregatePhaseProgress(points));
  drawProgressRows(r, "Avance por piso", groupRows(floors, points, "floor_id"));
  drawProgressRows(r, "Avance por tipo de dispositivo", deviceRows(points));

  const orderedFloors = [...floors].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const floor of orderedFloors) {
    await renderFloorScope(
      r,
      floor,
      spaces.filter((s) => s.floor_id === floor.id),
      points.filter((p) => p.floor_id === floor.id),
      { showBanner: true }
    );
  }

  stampFooters(r);
  return doc;
}

// Single point: just its sheet, for the checklist view's export button.
export async function buildPointDoc(point, floor, space) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const r = createReport(doc, `NetTrack Pro · Punto ${point?.name || ""}`);
  await drawPointSheet(r, point, {
    floorName: floor?.name || "—",
    spaceName: space?.name || "—",
  });
  stampFooters(r);
  return doc;
}

export async function exportFloorPdf(floor, spaces, points) {
  const doc = await buildFloorDoc(floor, spaces, points);
  doc.save(`piso-${(floor?.name || "piso").replace(/\s+/g, "-")}.pdf`);
}

export async function exportProjectPdf(floors, spaces, points) {
  const doc = await buildProjectDoc(floors, spaces, points);
  doc.save(`proyecto-nettrack-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportPointPdf(point, floor, space) {
  const doc = await buildPointDoc(point, floor, space);
  doc.save(`punto-${(point?.name || "punto").replace(/\s+/g, "-")}.pdf`);
}
