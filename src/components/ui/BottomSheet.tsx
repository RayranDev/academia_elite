"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * Hoja inferior: el patrón de diálogo que sirve en cancha, porque nace donde
 * está el pulgar. Cierra por overlay o Escape, igual que `Modal`.
 */
export function BottomSheet({
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

  return (
    // El velo va como HERMANO del diálogo, no como padre: si lo envolviera, su
    // `aria-hidden` sacaría toda la hoja del árbol de accesibilidad (un lector
    // de pantalla no vería nada de su contenido).
    <>
      <div
        className="fixed inset-0 z-50 bg-overlay/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-subtle bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle"
          aria-hidden
        />
        {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
        {children}
      </div>
    </>
  );
}
