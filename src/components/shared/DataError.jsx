import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

// Shown when a data query fails, with a retry action.
export default function DataError({ onRetry, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>
      <p className="text-sm font-medium">No se pudieron cargar los datos</p>
      <p className="text-xs text-muted-foreground mt-1">{message || "Revisa tu conexión e inténtalo de nuevo."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
        </Button>
      )}
    </div>
  );
}
