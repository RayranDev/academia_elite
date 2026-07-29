"use client";

import { useActionState, useEffect, useRef } from "react";
import { publicarAnuncioAction } from "@/actions/mensaje.actions";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/Button";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Formulario de "Publicar anuncio", compartido por DT y escuela (difieren en
 * si el alcance es opcional/global y si se puede fijar arriba). Antes era un
 * <form action={...}> plano con la action en Promise<void>: cualquier error
 * de validación (seguridad o no) tiraba al error.tsx genérico de la página en
 * vez de mostrar el mensaje junto al campo. Ahora usa useActionState +
 * ActionResult, como el resto de las actions del proyecto.
 */
export function PublicarAnuncioForm({
  categorias,
  categoriaOpcional = false,
  mostrarFijado = false,
}: {
  categorias: { id: string; nombre: string }[];
  categoriaOpcional?: boolean;
  mostrarFijado?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    publicarAnuncioAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-muted">
          {categoriaOpcional ? "Alcance" : "Categoría"}
        </label>
        <select name="categoriaId" className={input} required={!categoriaOpcional}>
          {categoriaOpcional && <option value="">Toda la escuela (global)</option>}
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Título</label>
        <input name="titulo" required className={input} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Cuerpo</label>
        <textarea name="cuerpo" rows={3} required className={input} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visibleJugador" className="accent-[color:var(--brand)]" />
        Mostrar {categoriaOpcional ? "al" : "también al"} jugador (noticia del club)
      </label>
      {mostrarFijado && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="fijado" className="accent-[color:var(--brand)]" />
          Fijar arriba
        </label>
      )}
      <div>
        <label className="mb-1 block text-xs text-muted">Caduca el (opcional)</label>
        <input name="caducaEn" type="date" className={input} />
        <p className="mt-1 text-xs text-muted">
          Al pasar la fecha deja de verse para las familias. Vacío = no vence.
        </p>
      </div>
      {state && !state.ok && (
        <p className="text-sm text-alerta" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando…" : "Publicar anuncio"}
      </Button>
    </form>
  );
}
