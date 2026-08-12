// Per-project branding + terminology helpers.

// Converts a hex color to the "H S% L%" channel format Tailwind expects for
// `hsl(var(--primary))`. Returns null for invalid input.
export function hexToHslChannels(hex) {
  if (!hex) return null;
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(lum * 100)}%`;
}

// Overrides (or clears) the app's primary brand color at runtime.
export function applyBrandColor(hex) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const ch = hexToHslChannels(hex);
  if (ch) root.style.setProperty("--primary", ch);
  else root.style.removeProperty("--primary");
}

// --- Terminology -----------------------------------------------------------

export const DEFAULT_TERMS = {
  project: "Proyecto", projects: "Proyectos",
  floor: "Piso", floors: "Pisos",
  space: "Espacio", spaces: "Espacios",
  point: "Punto", points: "Puntos",
};

export const TERM_FIELDS = [
  { key: "floors", label: "Pisos (plural)" },
  { key: "floor", label: "Piso (singular)" },
  { key: "spaces", label: "Espacios (plural)" },
  { key: "space", label: "Espacio (singular)" },
  { key: "points", label: "Puntos (plural)" },
  { key: "point", label: "Punto (singular)" },
];

export function resolveTerms(project) {
  const t = project?.terminology || {};
  const out = { ...DEFAULT_TERMS };
  for (const k of Object.keys(DEFAULT_TERMS)) {
    if (t[k] && String(t[k]).trim()) out[k] = String(t[k]).trim();
  }
  return out;
}

// --- Modules ---------------------------------------------------------------

// Modules that can be hidden per project. Dashboard, Proyectos and
// Configuración are core and always visible.
export const TOGGLEABLE_MODULES = [
  { key: "puntos", label: "Puntos" },
  { key: "rotulos", label: "Rótulos" },
  { key: "plantillas", label: "Plantillas" },
];

export function isModuleHidden(project, key) {
  return Array.isArray(project?.hidden_modules) && project.hidden_modules.includes(key);
}
