// Template definitions per device type
// Each template defines which checklist sections and items apply to that device type.

export const TEMPLATES = {
  ethernet: {
    label: "Ethernet",
    activities: ["act_perforacion", "act_pesca_cable", "act_ponchado"],
    showPonchadoType: true,
    accessories: ["acc_face_plate", "acc_tapa_face_plate", "acc_tornillos", "acc_rotulo", "acc_protector"],
    equipment: ["ponchado_rack", "funcionando"],
    showNetwork: true,
  },
  camara: {
    label: "Cámara CCTV",
    activities: ["act_perforacion", "act_pesca_cable", "act_ponchado"],
    showPonchadoType: true,
    accessories: ["acc_tornillos", "acc_rotulo"],
    equipment: ["equipo_instalado", "equipo_configurado", "equipo_probado", "funcionando", "ponchado_rack"],
    showNetwork: true,
  },
  access_point: {
    label: "Access Point WiFi",
    activities: ["act_perforacion", "act_pesca_cable", "act_ponchado"],
    showPonchadoType: true,
    accessories: ["acc_tornillos", "acc_rotulo"],
    equipment: ["equipo_instalado", "equipo_configurado", "equipo_probado", "funcionando", "ponchado_rack"],
    showNetwork: true,
  },
};

export const FIELD_LABELS = {
  act_perforacion: "Perforación",
  act_pesca_cable: "Pesca del cable",
  act_ponchado: "Ponchado",
  acc_face_plate: "Face Plate",
  acc_tapa_face_plate: "Tapa Face Plate",
  acc_tornillos: "Tornillos",
  acc_rotulo: "Rótulo",
  acc_protector: "Protector",
  equipo_instalado: "Equipo instalado",
  equipo_configurado: "Equipo configurado",
  equipo_probado: "Equipo probado",
  funcionando: "Funcionando correctamente",
  ponchado_rack: "Ponchado e identificado en rack",
};

export function getTemplate(deviceType) {
  return TEMPLATES[deviceType] || TEMPLATES.ethernet;
}