// Drawing primitives for the PDF reports.
//
// Everything here paints on a jsPDF document supplied by the caller, in points,
// and never decides where content goes: pagination and layout stay in the report
// modules (see exportFloorPdf.js). Colors mirror the web UI (Tailwind palette +
// the app's primary) so an exported sheet reads like the screen it came from.

export const C = {
  primary: [37, 99, 235], // hsl(221 83% 53%) — --primary
  primaryDark: [29, 78, 216],
  primarySoft: [219, 234, 254],
  ink: [15, 23, 42],
  text: [51, 65, 85],
  muted: [100, 116, 139],
  faint: [148, 163, 184],
  border: [226, 232, 240],
  hairline: [241, 245, 249],
  soft: [248, 250, 252],
  white: [255, 255, 255],
  green: [22, 163, 74],
  greenSoft: [220, 252, 231],
  amber: [217, 119, 6],
  amberSoft: [254, 243, 199],
  red: [220, 38, 38],
  redSoft: [254, 226, 226],
  slate: [100, 116, 139],
  slateSoft: [241, 245, 249],
  blue: [37, 99, 235],
  blueSoft: [239, 246, 255],
  purple: [147, 51, 234],
  purpleSoft: [250, 245, 255],
};

// Mirrors StatusBadge.
export const STATUS_STYLE = {
  pendiente: { label: "Pendiente", fg: C.slate, bg: C.slateSoft, dot: [148, 163, 184] },
  en_proceso: { label: "En proceso", fg: C.amber, bg: C.amberSoft, dot: [245, 158, 11] },
  finalizado: { label: "Finalizado", fg: C.green, bg: C.greenSoft, dot: [34, 197, 94] },
  con_observaciones: { label: "Con observaciones", fg: C.red, bg: C.redSoft, dot: [239, 68, 68] },
};

export const STATUS_ORDER = ["pendiente", "en_proceso", "finalizado", "con_observaciones"];

// Mirrors DeviceIcon.
export const DEVICE_STYLE = {
  ethernet: { fg: C.blue, bg: C.blueSoft },
  camara: { fg: C.purple, bg: C.purpleSoft },
  access_point: { fg: C.green, bg: [240, 253, 244] },
};

// Mirrors PhaseChips / the phase badges in the checklist view.
export const PHASE_STYLE = {
  piso: { label: "Piso", fg: C.primaryDark, bg: C.blueSoft, dot: [59, 130, 246] },
  rack: { label: "Rack", fg: [126, 34, 206], bg: C.purpleSoft, dot: [168, 85, 247] },
};

export function fill(doc, color) {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function stroke(doc, color) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

export function ink(doc, color) {
  doc.setTextColor(color[0], color[1], color[2]);
}

export function font(doc, style = "normal", size = 9) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

// Rounded panel with optional fill and 1px-ish border.
export function panel(doc, x, y, w, h, { r = 8, bg, border, lineWidth = 0.7 } = {}) {
  if (bg) fill(doc, bg);
  if (border) {
    stroke(doc, border);
    doc.setLineWidth(lineWidth);
  }
  const style = bg && border ? "FD" : bg ? "F" : "S";
  if (r > 0) doc.roundedRect(x, y, w, h, r, r, style);
  else doc.rect(x, y, w, h, style);
}

// Truncates text with an ellipsis to fit maxW using the *current* font.
export function clip(doc, text, maxW) {
  const s = String(text ?? "");
  if (!s || doc.getTextWidth(s) <= maxW) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (doc.getTextWidth(`${s.slice(0, mid)}…`) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return `${s.slice(0, lo)}…`;
}

// Single line of text. Returns the x where the text ends.
export function line(doc, text, x, y, { size = 8.5, style = "normal", color = C.text, align = "left", baseline = "top", maxW, charSpace } = {}) {
  font(doc, style, size);
  ink(doc, color);
  const s = maxW ? clip(doc, text, maxW) : String(text ?? "");
  const opts = { baseline, align };
  if (charSpace) opts.charSpace = charSpace;
  doc.text(s, x, y, opts);
  return align === "left" ? x + doc.getTextWidth(s) : x;
}

// Wrapped paragraph. Returns the height consumed.
export function paragraph(doc, text, x, y, w, { size = 8.5, style = "normal", color = C.text, lineHeight = 1.35 } = {}) {
  font(doc, style, size);
  ink(doc, color);
  const lines = doc.splitTextToSize(String(text ?? ""), w);
  const lh = size * lineHeight;
  lines.forEach((ln, i) => doc.text(ln, x, y + i * lh, { baseline: "top" }));
  return lines.length * lh;
}

// Height a paragraph() call with the same options would take.
export function paragraphHeight(doc, text, w, { size = 8.5, style = "normal", lineHeight = 1.35 } = {}) {
  font(doc, style, size);
  return Math.max(1, doc.splitTextToSize(String(text ?? ""), w).length) * size * lineHeight;
}

// Rounded chip with optional leading dot. Returns its width.
export function pill(doc, x, y, text, { fg = C.slate, bg = C.slateSoft, size = 7.5, h = 13, padX = 6, dot } = {}) {
  font(doc, "bold", size);
  const tw = doc.getTextWidth(String(text ?? ""));
  const dotW = dot ? 8 : 0;
  const w = tw + padX * 2 + dotW;
  fill(doc, bg);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (dot) {
    fill(doc, dot);
    doc.circle(x + padX + 2.5, y + h / 2, 2.2, "F");
  }
  ink(doc, fg);
  doc.text(String(text ?? ""), x + padX + dotW, y + h / 2 + 0.4, { baseline: "middle" });
  return w;
}

export function pillWidth(doc, text, { size = 7.5, padX = 6, dot } = {}) {
  font(doc, "bold", size);
  return doc.getTextWidth(String(text ?? "")) + padX * 2 + (dot ? 8 : 0);
}

// Progress bar (rounded track + filled portion), mirroring ProgressBar.
export function bar(doc, x, y, w, pct, { h = 5, color = C.primary, track = C.slateSoft } = {}) {
  const value = Math.max(0, Math.min(100, pct || 0));
  fill(doc, track);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (value > 0) {
    fill(doc, color);
    doc.roundedRect(x, y, Math.max(h, (w * value) / 100), h, h / 2, h / 2, "F");
  }
}

// Checkbox + label, drawn (not typed) so it never depends on font glyphs.
// Returns the x where the label ends, so callers can append a badge.
export function check(doc, x, y, label, checked, { size = 9.5, gap = 6, fontSize = 8.5, maxW } = {}) {
  if (checked) {
    fill(doc, C.primary);
    stroke(doc, C.primary);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, size, size, 2, 2, "FD");
    stroke(doc, C.white);
    doc.setLineWidth(1.2);
    doc.line(x + size * 0.23, y + size * 0.53, x + size * 0.42, y + size * 0.73);
    doc.line(x + size * 0.42, y + size * 0.73, x + size * 0.78, y + size * 0.27);
  } else {
    fill(doc, C.white);
    stroke(doc, C.border);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, y, size, size, 2, 2, "FD");
  }
  const tx = x + size + gap;
  font(doc, "normal", fontSize);
  ink(doc, checked ? C.ink : C.muted);
  const text = maxW ? clip(doc, label, maxW - (size + gap)) : String(label ?? "");
  doc.text(text, tx, y + size / 2 + 0.3, { baseline: "middle" });
  return tx + doc.getTextWidth(text);
}

// Filled circular sector, approximated with short straight segments.
function sector(doc, cx, cy, radius, a0, a1, color) {
  const step = Math.PI / 60; // 3°
  const points = [];
  for (let a = a0; a < a1; a += step) points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  points.push([cx + radius * Math.cos(a1), cy + radius * Math.sin(a1)]);
  const rel = [];
  let prev = [cx, cy];
  for (const p of points) {
    rel.push([p[0] - prev[0], p[1] - prev[1]]);
    prev = p;
  }
  fill(doc, color);
  doc.lines(rel, cx, cy, [1, 1], "F", true);
}

// Donut chart. segments: [{ value, color }]. Starts at 12 o'clock, clockwise.
export function donut(doc, cx, cy, rOuter, rInner, segments) {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  if (total <= 0) {
    fill(doc, C.hairline);
    doc.circle(cx, cy, rOuter, "F");
  } else {
    let a = -Math.PI / 2;
    for (const s of segments) {
      if (!s.value) continue;
      const sweep = (s.value / total) * Math.PI * 2;
      sector(doc, cx, cy, rOuter, a, a + sweep, s.color);
      a += sweep;
    }
  }
  fill(doc, C.white);
  doc.circle(cx, cy, rInner, "F");
}

// Progress ring with the percentage in the middle, mirroring ProgressRing.
export function ring(doc, cx, cy, radius, thickness, pct, { color = C.primary, track = C.hairline, labelSize } = {}) {
  const value = Math.max(0, Math.min(100, pct || 0));
  fill(doc, track);
  doc.circle(cx, cy, radius, "F");
  if (value > 0) {
    sector(doc, cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (value / 100) * Math.PI * 2, color);
  }
  fill(doc, C.white);
  doc.circle(cx, cy, radius - thickness, "F");
  const size = labelSize || Math.max(7, radius * 0.62);
  font(doc, "bold", size);
  ink(doc, C.ink);
  doc.text(`${Math.round(value)}%`, cx, cy + 0.5, { align: "center", baseline: "middle" });
}

// KPI tile: accent bar + label + big value (+ optional sub next to it).
export function kpiCard(doc, x, y, w, h, { label, value, sub, color = C.primary }) {
  panel(doc, x, y, w, h, { bg: C.white, border: C.border, r: 8 });
  fill(doc, color);
  doc.roundedRect(x + 10, y + 12, 3.5, h - 24, 2, 2, "F");
  const tx = x + 22;
  line(doc, label, tx, y + 12, { size: 7.5, color: C.muted, maxW: w - 32 });
  font(doc, "bold", 17);
  ink(doc, C.ink);
  doc.text(String(value), tx, y + h - 14, { baseline: "alphabetic" });
  if (sub) {
    const vw = doc.getTextWidth(String(value));
    line(doc, sub, tx + vw + 5, y + h - 14, { size: 7.5, color: C.muted, baseline: "alphabetic", maxW: w - 32 - vw - 5 });
  }
}

// Labelled read-only field that echoes the web inputs (label above a box).
export function field(doc, x, y, w, label, value, { h = 18, color = C.ink, bg = C.soft, placeholder = "—" } = {}) {
  line(doc, label, x, y, { size: 7, color: C.muted, maxW: w });
  const boxY = y + 9;
  panel(doc, x, boxY, w, h, { bg, border: C.border, r: 5 });
  const text = String(value ?? "").trim();
  font(doc, "normal", 8.5);
  ink(doc, text ? color : C.faint);
  doc.text(clip(doc, text || placeholder, w - 12), x + 6, boxY + h / 2 + 0.4, { baseline: "middle" });
  return 9 + h;
}

// Multi-line variant of field(), for descriptions / observations.
export function fieldBlock(doc, x, y, w, label, value, { minH = 28, color = C.ink, bg = C.soft, placeholder = "—", size = 8.5 } = {}) {
  if (label) line(doc, label, x, y, { size: 7, color: C.muted, maxW: w });
  const boxY = label ? y + 9 : y;
  const text = String(value ?? "").trim();
  const inner = w - 14;
  const h = Math.max(minH, paragraphHeight(doc, text || placeholder, inner, { size }) + 11);
  panel(doc, x, boxY, w, h, { bg, border: C.border, r: 5 });
  paragraph(doc, text || placeholder, x + 7, boxY + 5.5, inner, { size, color: text ? color : C.faint });
  return (label ? 9 : 0) + h;
}

export function fieldBlockHeight(doc, w, value, { minH = 28, label = true, placeholder = "—", size = 8.5 } = {}) {
  const text = String(value ?? "").trim();
  const h = Math.max(minH, paragraphHeight(doc, text || placeholder, w - 14, { size }) + 11);
  return (label ? 9 : 0) + h;
}

// --- Evidence photos -------------------------------------------------------

const imageCache = new Map();

function loadHtmlImage(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

// Fetches a photo and re-encodes it as a bounded JPEG data URL, so a report with
// many photos stays a reasonable file size. Fetching to a blob first also keeps
// the canvas untainted; the crossOrigin retry covers servers that only allow the
// image request itself.
async function toBoundedJpeg(url, maxPx) {
  let objectUrl = null;
  let img;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    objectUrl = URL.createObjectURL(await res.blob());
    img = await loadHtmlImage(objectUrl);
  } catch {
    img = await loadHtmlImage(url, true);
  }
  try {
    const natural = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const scale = Math.min(1, maxPx / natural);
    const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.72), w, h };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// Returns { dataUrl, w, h } or null when the photo can't be embedded (offline,
// CORS, deleted file). Results — including failures — are cached per export.
export async function loadPhoto(url, maxPx = 900) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url);
  let result = null;
  try {
    result = await toBoundedJpeg(url, maxPx);
  } catch (e) {
    console.warn("No se pudo incluir una foto de evidencia en el PDF.", url, e);
  }
  imageCache.set(url, result);
  return result;
}

// Draws a photo "contain"-fitted inside a square cell, with a caption strip.
export function photoCell(doc, x, y, size, photo, caption) {
  panel(doc, x, y, size, size, { bg: C.soft, border: C.border, r: 6 });
  if (photo) {
    const scale = Math.min((size - 8) / photo.w, (size - 8) / photo.h);
    const w = photo.w * scale;
    const h = photo.h * scale;
    doc.addImage(photo.dataUrl, "JPEG", x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    font(doc, "normal", 6.5);
    ink(doc, C.faint);
    doc.text("Foto no\ndisponible", x + size / 2, y + size / 2, { align: "center", baseline: "middle" });
  }
  if (caption) {
    line(doc, caption, x, y + size + 3, { size: 6.5, color: C.faint, maxW: size });
  }
}
