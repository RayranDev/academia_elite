"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { importarJugadoresAction } from "@/actions/gestion.actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import type { ResultadoImportacion } from "@/services/importacion.service";

/**
 * Carga masiva de jugadores por CSV. La plantilla se descarga ya con las
 * categorías válidas de la escuela; el resultado detalla creados/omitidos/errores.
 */
export function ImportarJugadoresDialog({ escuelaId }: { escuelaId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    ActionResult<ResultadoImportacion> | undefined,
    FormData
  >(importarJugadoresAction, undefined);

  const resultado = state?.ok ? state.data : undefined;
  const plantillaHref = escuelaId
    ? `/api/plantilla-jugadores?escuelaId=${encodeURIComponent(escuelaId)}`
    : "/api/plantilla-jugadores";

  function cerrar() {
    setOpen(false);
    if (resultado && resultado.creados > 0) router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" aria-hidden /> Importar CSV
      </Button>

      <Modal open={open} onClose={cerrar} title="Importar jugadores (CSV)">
        <div className="space-y-4">
          <a
            href={plantillaHref}
            className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm font-semibold hover:border-brand"
          >
            <Download className="h-4 w-4" aria-hidden /> Descargar plantilla
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
                  {resultado.errores.map((e) => (
                    <li key={e.fila}>Fila {e.fila}: {e.mensaje}</li>
                  ))}
                </ul>
              )}
              <Button className="w-full" onClick={cerrar}>
                Listo
              </Button>
            </div>
          ) : (
            <form action={action} className="space-y-3">
              {escuelaId && <input type="hidden" name="escuelaId" value={escuelaId} />}
              <input
                name="archivo"
                type="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {state && !state.ok && (
                <p className="text-sm text-alerta" role="alert">
                  {state.error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={pending}>
                  {pending ? "Importando…" : "Importar"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
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
