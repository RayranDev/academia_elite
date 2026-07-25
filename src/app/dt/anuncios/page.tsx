import { requireAuthContext } from "@/lib/auth/session";
import { listarAnuncios } from "@/services/mensaje.service";
import { listarCategoriasDelDt } from "@/services/jugador.service";
import { publicarAnuncioAction } from "@/actions/mensaje.actions";
import { ListaAnuncios } from "@/components/messages/ListaAnuncios";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Anuncios" };

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

/** Anuncios del DT en su propia sección (antes vivían dentro de Mensajes). */
export default async function DtAnunciosPage() {
  const ctx = await requireAuthContext();
  const [anuncios, categorias] = await Promise.all([
    listarAnuncios(ctx),
    listarCategoriasDelDt(ctx),
  ]);
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="self-start">
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
          <div>
            <label className="mb-1 block text-xs text-muted">
              Caduca el (opcional)
            </label>
            <input name="caducaEn" type="date" className={input} />
            <p className="mt-1 text-xs text-muted">
              Al pasar la fecha deja de verse para las familias. Vacío = no vence.
            </p>
          </div>
          <Button type="submit">Publicar anuncio</Button>
        </form>
      </Card>

      <div className="space-y-2">
        <h1 className="text-3xl font-display italic uppercase">Anuncios</h1>
        <p className="text-xs text-muted">
          Así los ven las familias de tus categorías. Podés borrarlos.
        </p>
        <ListaAnuncios
          anuncios={anuncios}
          nombreCat={Object.fromEntries(nombreCat)}
        />
      </div>
    </div>
  );
}
