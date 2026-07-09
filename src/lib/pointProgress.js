export function getPointProgress(point) {
  if (!point) return 0;
  if (point.status === "finalizado") return 100;

  const fields = [
    point.act_perforacion,
    point.act_pesca_cable,
    point.act_ponchado,
  ];
  if (point.device_type === "ethernet") {
    fields.push(
      point.acc_face_plate,
      point.acc_tapa_face_plate,
      point.acc_tornillos,
      point.acc_rotulo,
      point.acc_protector
    );
  }
  fields.push(
    point.equipo_instalado,
    point.equipo_configurado,
    point.equipo_probado,
    point.funcionando,
    point.ponchado_rack
  );
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}