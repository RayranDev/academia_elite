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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          // max-h + scroll: un modal alto (p. ej. el form de fondos) desbordaba
          // el viewport y obligaba a bajar el zoom para navegarlo.
          "max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-subtle bg-surface p-6 shadow-2xl",
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
