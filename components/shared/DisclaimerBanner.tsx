"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Sticky bottom disclaimer banner shown site-wide.
 * Users can dismiss it for the current session.
 */
export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-amber-500/95 backdrop-blur-sm px-4 py-2.5 text-black text-sm shadow-lg">
      <p className="flex-1 text-center font-medium leading-snug">
        🚧 Estamos implementando todas las funcionalidades del sitio — todas las transacciones están en{" "}
        <strong>modo prueba</strong>. ¡Estamos trabajando por ti! 😊
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 hover:bg-black/15 transition-colors"
        aria-label="Cerrar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
