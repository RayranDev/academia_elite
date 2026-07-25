import { requireAuthContext } from "@/lib/auth/session";
import { listarConversaciones } from "@/services/mensaje.service";
import {
  listarActivosDt,
  listarCategoriasDelDt,
} from "@/services/jugador.service";
import { MensajesDtFiltro } from "@/components/messages/MensajesDtFiltro";
import { NuevaConversacionDialog } from "@/components/messages/NuevaConversacionDialog";

// Los anuncios se movieron a su propia sección (/dt/anuncios): esta pantalla
// queda solo para las conversaciones.
export default async function DtMensajesPage() {
  const ctx = await requireAuthContext();
  const [conversaciones, jugadores, categorias] = await Promise.all([
    listarConversaciones(ctx),
    listarActivosDt(ctx),
    listarCategoriasDelDt(ctx),
  ]);

  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
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
  );
}
