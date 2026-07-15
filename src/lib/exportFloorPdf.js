import { jsPDF } from "jspdf";
import { getTemplate, FIELD_LABELS } from "./checklistTemplates";
import { getPointProgress } from "./pointProgress";

const STATUS_LABELS = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  finalizado: "Finalizado",
  con_observaciones: "Con observaciones",
};

const SPACE_LABELS = {
  habitacion: "Habitación",
  pasillo: "Pasillo",
  sala: "Sala",
  otro: "Otro",
};

const STATUS_COLORS = {
  finalizado: [22, 163, 74],
  en_proceso: [217, 119, 6],
  con_observaciones: [220, 38, 38],
  pendiente: [100, 116, 139],
};

export function exportFloorPdf(floor, spaces, points) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 0;

  const ensureSpace = (h) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NetTrack Pro — Reporte de Piso", margin, 38);
  y = 80;

  // Floor title
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(floor?.name || "Piso", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Espacios: ${spaces.length}   |   Puntos: ${points.length}   |   Generado: ${new Date().toLocaleDateString("es")}`,
    margin,
    y
  );
  y += 20;

  // Summary
  const statusCounts = { pendiente: 0, en_proceso: 0, finalizado: 0, con_observaciones: 0 };
  for (const p of points) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(
    `Resumen: ${statusCounts.finalizado} finalizados, ${statusCounts.en_proceso} en proceso, ${statusCounts.pendiente} pendientes, ${statusCounts.con_observaciones} con observaciones`,
    margin,
    y
  );
  y += 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Sort spaces
  const typeOrder = { habitacion: 0, sala: 1, pasillo: 2, otro: 99 };
  const sortedSpaces = [...spaces].sort((a, b) => {
    const d = (typeOrder[a.space_type] ?? 99) - (typeOrder[b.space_type] ?? 99);
    if (d !== 0) return d;
    return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true });
  });

  for (const s of sortedSpaces) {
    const spacePoints = points
      .filter((p) => p.space_id === s.id)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true }));

    ensureSpace(30);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageW - 2 * margin, 24, 4, 4, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(s.name || "", margin + 8, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${SPACE_LABELS[s.space_type] || "Otro"}   |   ${spacePoints.length} puntos`,
      pageW - margin - 100,
      y + 16
    );
    y += 32;

    for (const pt of spacePoints) {
      ensureSpace(80);
      const tpl = getTemplate(pt.device_type);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(pt.name || "", margin + 4, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(tpl.label || "", margin + 120, y);
      doc.setTextColor(...(STATUS_COLORS[pt.status] || STATUS_COLORS.pendiente));
      doc.text(STATUS_LABELS[pt.status] || "Pendiente", pageW - margin - 4, y, { align: "right" });
      y += 12;

      if (pt.technician) {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(`Técnico: ${pt.technician}`, margin + 4, y);
        y += 11;
      }

      // Checklist
      const allFields = [...tpl.activities, ...tpl.accessories, ...tpl.equipment];
      const customChecks = tpl.customChecks || [];
      if (allFields.length + customChecks.length > 0) {
        doc.setFontSize(7.5);
        let x = margin + 4;
        const colW = 120;
        for (const f of allFields) {
          const done = !!pt[f];
          if (x + colW > pageW - margin) {
            x = margin + 4;
            y += 11;
            ensureSpace(20);
          }
          doc.setTextColor(done ? 22 : 148, done ? 163 : 163, done ? 74 : 184);
          doc.text(`${done ? "\u2713" : "\u2717"} ${FIELD_LABELS[f] || f}`, x, y);
          x += colW;
        }
        for (const c of customChecks) {
          const done = !!pt.custom_checks?.[c.id];
          if (x + colW > pageW - margin) {
            x = margin + 4;
            y += 11;
            ensureSpace(20);
          }
          doc.setTextColor(done ? 22 : 148, done ? 163 : 163, done ? 74 : 184);
          doc.text(`${done ? "\u2713" : "\u2717"} ${c.label}`, x, y);
          x += colW;
        }
        y += 13;
      }

      // Network
      if (pt.puerto_patch_panel || pt.puerto_switch || pt.vlan) {
        ensureSpace(15);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7.5);
        const netParts = [];
        if (pt.puerto_patch_panel) netParts.push(`Patch Panel: ${pt.puerto_patch_panel}`);
        if (pt.puerto_switch) netParts.push(`Switch: ${pt.puerto_switch}`);
        if (pt.vlan) netParts.push(`VLAN: ${pt.vlan}`);
        doc.text(netParts.join("   |   "), margin + 4, y);
        y += 12;
      }

      // Observations
      if (pt.observaciones) {
        ensureSpace(15);
        doc.setTextColor(220, 38, 38);
        doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(`Obs: ${pt.observaciones}`, pageW - 2 * margin - 8);
        doc.text(lines, margin + 4, y);
        y += lines.length * 10;
      }

      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin + 4, y, pageW - margin, y);
      y += 6;
    }
    y += 6;
  }

  doc.save(`piso-${(floor?.name || "piso").replace(/\s+/g, "-")}.pdf`);
}