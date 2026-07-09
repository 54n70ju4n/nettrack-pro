import React from "react";
import { Cable, Camera, Wifi } from "lucide-react";

const icons = {
  ethernet: { icon: Cable, color: "text-blue-600", bg: "bg-blue-50" },
  camara: { icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
  access_point: { icon: Wifi, color: "text-green-600", bg: "bg-green-50" },
};

export default function DeviceIcon({ type, size = "md" }) {
  const config = icons[type] || icons.ethernet;
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <div className={`${sizeClasses} rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`${iconSize} ${config.color}`} />
    </div>
  );
}