import { getTemplate } from "./checklistTemplates";

export function getPointProgress(point) {
  if (!point) return 0;
  if (point.status === "finalizado") return 100;

  const tpl = getTemplate(point.device_type);
  const fields = [
    ...tpl.activities,
    ...tpl.accessories,
    ...tpl.equipment,
  ];
  const customChecks = tpl.customChecks || [];

  const done = fields.filter((f) => point[f]).length;
  const customDone = customChecks.filter((c) => point.custom_checks?.[c.id]).length;
  const total = fields.length + customChecks.length;
  return total ? Math.round(((done + customDone) / total) * 100) : 0;
}