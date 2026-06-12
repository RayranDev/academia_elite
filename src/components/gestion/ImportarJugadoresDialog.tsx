"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { importarJugadoresAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ResultadoImportacion } from "@/services/importacion.service";

/**
 * Carga masiva de jugadores por Excel (.xlsx). La plantilla se descarga ya con
 * las categorías válidas de la escuela; el resultado detalla creados / omitidos
 * / errores por fila. El estado se reinicia SIEMPRE al cerrar el modal (botón,
 * clic fuera o Escape) para no arrastrar errores de una importación anterior.
 */
export function ImportarJugadoresDialog({ escuelaId }: { escuelaId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const plantillaHref = escuelaId
    ? `/api/plantilla-jugadores?escuelaId=${encodeURIComponent(escuelaId)}`
    : "/api/plantilla-jugadores";

  /** Limpia TODO el estado del modal (archivo, errores, mensajes). */
  function resetEstado() {
    setResultado(null);
    setError(null);
    formRef.current?.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function abrir() {
    resetEstado();
    setOpen(true);
  }

  function cerrar() {
    const huboCreados = !!resultado && resultado.creados > 0;
    setOpen(false);
    resetEstado(); // reset obligatorio al cerrar (X/clic fuera/Escape)
    if (huboCreados) router.refresh();
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) {
      setError("Adjunta un archivo Excel (.xlsx).");
      return;
    }
    const fd = new FormData();
    if (escuelaId) fd.set("escuelaId", escuelaId);
    fd.set("archivo", archivo);
    startTransition(async () => {
      const res = await importarJugadoresAction(undefined, fd);
      if (res.ok) {
        setError(null);
        setResultado(res.data ?? { creados: 0, omitidos: 0, errores: [] });
      } else {
        setResultado(null);
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={abrir}>
        <Upload className="mr-1 h-4 w-4" aria-hidden /> Importar Excel
      </Button>

      <Modal open={open} onClose={cerrar} title="Importar jugadores (Excel)">
        <div className="space-y-4">
          <a
            href={plantillaHref}
            className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            <Download className="h-4 w-4" aria-hidden /> Descargar plantilla (.xlsx)
          </a>
          <p className="text-xs text-muted">
            Rellena la plantilla en Excel y vuelve a subirla. Columnas: nombre,
            apellido, fechaNacimiento (AAAA-MM-DD), posicion (POR/DEF/MED/DEL),
            dorsal (opcional) y categoria. Se crean solo jugadores; las familias
            se vinculan luego con su código de invitación.
          </p>

          {resultado ? (
            <div className="space-y-2 rounded-lg border border-subtle bg-surface-2 p-4 text-sm">
              <p className="font-semibold text-brand">
                {resultado.creados} creados · {resultado.omitidos} omitidos ·{" "}
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
            <form ref={formRef} onSubmit={enviar} className="space-y-3">
              <input
                ref={inputRef}
                name="archivo"
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
                  {pending ? "Importando…" : "Importar"}
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
