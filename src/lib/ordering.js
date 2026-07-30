// Manual ordering helpers shared by the spaces/points lists.
//
// The manual `order` field is a number, but users type it with a dot or comma
// (e.g. "1.2" or "1,2") to place items between others. parseOrder normalizes
// that text into a number for storage; formatOrder renders it back for display.

export function parseOrder(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = parseFloat(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatOrder(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

// Natural, case-insensitive comparison of names, so "Punto 2" sorts before
// "Punto 10".
function compareNames(a, b) {
  return (a?.name || "").localeCompare(b?.name || "", undefined, { numeric: true, sensitivity: "base" });
}

// Comparator factory. mode "manual" sorts by the numeric order field (name as
// tie-breaker); mode "name" sorts purely by name.
export function itemComparator(mode) {
  if (mode === "name") return compareNames;
  return (a, b) => {
    const diff = parseOrder(a?.order) - parseOrder(b?.order);
    if (diff !== 0) return diff;
    return compareNames(a, b);
  };
}

// Returns a new array sorted by the given mode without mutating the input.
export function sortItems(items, mode) {
  return [...items].sort(itemComparator(mode));
}
