import { requireAuthContext } from "@/lib/auth/session";
import { listarConversaciones } from "@/services/mensaje.service";
import {
  listarActivosDt,
  listarCategoriasDelDt,
} from "@/services/jugador.service";
import { publicarAnuncioAction } from "@/actions/mensaje.actions";
import { MensajesDtFiltro } from "@/components/messages/MensajesDtFiltro";
import { NuevaConversacionDialog } from "@/components/messages/NuevaConversacionDialog";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function DtMensajesPage() {
  const ctx = await requireAuthContext();
  const [conversaciones, jugadores, categorias] = await Promise.all([
    listarConversaciones(ctx),
    listarActivosDt(ctx),
    listarCategoriasDelDt(ctx),
  ]);

  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display italic uppercase">Mensajes</h1>
          <NuevaConversacionDialog
            basePath="/dt/mensajes"
            jugadores={jugadores.map((j) => ({
              id: j.id,
              label: `${j.nombre} ${j.apellido}`,
              categoria: nombreCat.get(j.categoriaId) ?? "Sin categoría",
            }))}
          />
        </div>
        <MensajesDtFiltro conversaciones={conversaciones} categorias={categorias} />
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Publicar anuncio</h2>
        <form action={publicarAnuncioAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Categoría</label>
            <select name="categoriaId" className={input} required>
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
            Mostrar también al jugador (noticia del club)
          </label>
          <Button type="submit">Publicar anuncio</Button>
        </form>
      </Card>
    </div>
  );
}
