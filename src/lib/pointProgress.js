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

  const done = fields.filter((f) => point[f]).length;
  return fields.length ? Math.round((done / fields.length) * 100) : 0;
}