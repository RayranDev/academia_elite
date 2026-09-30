"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // `cn` solo concatena: con `max-w-md` por defecto Y un `max-w-*` pasado por
  // quien lo usa, ganaba el que Tailwind generara último, no el que se pedía.
  // (`FotoCropper` pedía `max-w-lg` y nunca lo tuvo.) Si el llamador fija el
  // ancho, el por defecto se omite.
  const fijaAncho = /(^|\s)max-w-/.test(className ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          // max-h + scroll: un modal alto (p. ej. el form de fondos) desbordaba
          // el viewport y obligaba a bajar el zoom para navegarlo.
          "max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-subtle bg-surface p-6 shadow-2xl",
          !fijaAncho && "max-w-md",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <h2 className="mb-4 text-xl font-black italic uppercase">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
