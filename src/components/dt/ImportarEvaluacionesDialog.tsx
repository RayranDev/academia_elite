"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ClipboardList } from "lucide-react";
import { importarEvaluacionesAction } from "@/actions/dt.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ResultadoImportEval } from "@/services/importacion-evaluaciones.service";

/**
 * Jornada de medición: carga masiva de evaluaciones por Excel (.xlsx). Permite
 * evaluar jugadores existentes (con su código) y crear+evaluar nuevos. El estado
 * se reinicia al cerrar el modal.
 */
export function ImportarEvaluacionesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportEval | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function abrir() {
    reset();
    setOpen(true);
  }

  function cerrar() {
    const hubo = !!resultado && (resultado.evaluados > 0 || resultado.creadosNuevos > 0);
    setOpen(false);
    reset();
    if (hubo) router.refresh();
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) {
      setError("Adjunta un archivo Excel (.xlsx).");
      return;
    }
    const fd = new FormData();
    fd.set("archivo", archivo);
    startTransition(async () => {
      const res = await importarEvaluacionesAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setResultado(res.data ?? { evaluados: 0, creadosNuevos: 0, errores: [] });
      } else {
        setResultado(null);
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={abrir}>
        <ClipboardList className="mr-1 h-4 w-4" aria-hidden /> Jornada de medición
      </Button>

      <Modal open={open} onClose={cerrar} title="Jornada de medición (Excel)">
        <div className="space-y-4">
          <a
            href="/api/plantilla-evaluaciones"
            className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            <Download className="h-4 w-4" aria-hidden /> Descargar plantilla (.xlsx)
          </a>
          <p className="text-xs text-muted">
            Una fila por jugador. Para evaluar a un jugador existente, rellena su{" "}
            <b>código</b>; para uno nuevo, deja el código vacío y completa sus
            datos (se crea y se evalúa). La plantilla trae tus jugadores y
            categorías.
          </p>

          {resultado ? (
            <div className="space-y-2 rounded-lg border border-subtle bg-surface-2 p-4 text-sm">
              <p className="font-semibold text-brand">
                {resultado.evaluados} evaluados · {resultado.creadosNuevos} nuevos ·{" "}
                {resultado.errores.length} con error
              </p>
              {resultado.errores.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-alerta">
                  {resultado.errores.map((er) => (
                    <li key={er.fila}>Fila {er.fila}: {er.mensaje}</li>
                  ))}
                </ul>
              )}
              <Button className="w-full" onClick={cerrar}>
                Listo
              </Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-3">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {error && (
                <p className="text-sm text-alerta" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={pending}>
                  {pending ? "Procesando…" : "Cargar jornada"}
                </Button>
                <Button type="button" variant="secondary" onClick={cerrar}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
