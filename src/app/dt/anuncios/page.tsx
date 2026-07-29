import { requireAuthContext } from "@/lib/auth/session";
import { listarAnuncios } from "@/services/mensaje.service";
import { listarCategoriasDelDt } from "@/services/jugador.service";
import { PublicarAnuncioForm } from "@/components/messages/PublicarAnuncioForm";
import { ListaAnuncios } from "@/components/messages/ListaAnuncios";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Anuncios" };

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
        <PublicarAnuncioForm categorias={categorias} />
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
