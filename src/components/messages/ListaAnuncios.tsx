"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { eliminarAnuncioAction } from "@/actions/mensaje.actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AnuncioDTO } from "@/services/mensaje.service";

/**
 * Lista de anuncios publicados tal como los ve el destinatario (título, cuerpo,
 * alcance y badges), con opción de borrarlos. Compartida por el DT y la escuela;
 * la autorización real del borrado la aplica el servicio.
 */
export function ListaAnuncios({
  anuncios,
  nombreCat,
}: {
  anuncios: AnuncioDTO[];
  nombreCat: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function borrar(id: string, titulo: string) {
    if (!window.confirm(`¿Borrar el anuncio "${titulo}"? No se puede deshacer.`)) {
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("anuncioId", id);
    startTransition(async () => {
      const res = await eliminarAnuncioAction(undefined, fd);
      if (!res.ok) setError(res.error);
    });
  }

  if (anuncios.length === 0) {
    return (
      <Card>
        <p className="text-muted">Todavía no publicaste anuncios.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta" role="alert">
          {error}
        </p>
      )}
      {anuncios.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold">{a.titulo}</h3>
            <div className="flex shrink-0 items-center gap-1">
              {a.fijado && <Badge tono="oro">Fijado</Badge>}
              {a.visibleJugador && <Badge tono="pitch">Visible al jugador</Badge>}
            </div>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{a.cuerpo}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              {a.categoriaId ? nombreCat[a.categoriaId] ?? "Categoría" : "Global"} ·{" "}
              {new Date(a.createdAt).toLocaleDateString("es")}
            </p>
            <button
              type="button"
              onClick={() => borrar(a.id, a.titulo)}
              disabled={pending}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-alerta hover:underline disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Borrar
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
