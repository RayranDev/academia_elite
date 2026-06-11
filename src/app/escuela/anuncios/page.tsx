import { requireAuthContext } from "@/lib/auth/session";
import { listarAnuncios } from "@/services/mensaje.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { publicarAnuncioAction } from "@/actions/mensaje.actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function AnunciosPage() {
  const ctx = await requireAuthContext();
  const [anuncios, categorias] = await Promise.all([
    listarAnuncios(ctx),
    listarCategoriasEscuela(ctx),
  ]);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="self-start">
        <h2 className="mb-3 text-lg font-bold">Publicar anuncio</h2>
        <form action={publicarAnuncioAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Alcance</label>
            <select name="categoriaId" className={input}>
              <option value="">Toda la escuela (global)</option>
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
            Mostrar al jugador (noticia del club)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="fijado" className="accent-[color:var(--brand)]" />
            Fijar arriba
          </label>
          <Button type="submit">Publicar</Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h1 className="text-3xl font-black italic uppercase">Anuncios</h1>
        {anuncios.length === 0 ? (
          <Card>
            <p className="text-muted">Aún no hay anuncios.</p>
          </Card>
        ) : (
          anuncios.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{a.titulo}</h3>
                <div className="flex gap-1">
                  {a.fijado && <Badge tono="oro">Fijado</Badge>}
                  {a.visibleJugador && <Badge tono="pitch">Visible al jugador</Badge>}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{a.cuerpo}</p>
              <p className="mt-2 text-[11px] text-muted">
                {a.categoriaId ? nombreCat.get(a.categoriaId) ?? "Categoría" : "Global"} ·{" "}
                {new Date(a.createdAt).toLocaleDateString("es")}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
