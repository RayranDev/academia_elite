import { requireAuthContext } from "@/lib/auth/session";
import { listarAnuncios } from "@/services/mensaje.service";
import { listarCategoriasEscuela } from "@/services/categoria.service";
import { PublicarAnuncioForm } from "@/components/messages/PublicarAnuncioForm";
import { ListaAnuncios } from "@/components/messages/ListaAnuncios";
import { Card } from "@/components/ui/Card";

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
        <PublicarAnuncioForm categorias={categorias} categoriaOpcional mostrarFijado />
      </Card>

      <div className="space-y-3">
        <h1 className="text-3xl font-black italic uppercase">Anuncios</h1>
        <ListaAnuncios anuncios={anuncios} nombreCat={Object.fromEntries(nombreCat)} />
      </div>
    </div>
  );
}
