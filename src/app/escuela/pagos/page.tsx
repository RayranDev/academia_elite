import { requireAuthContext } from "@/lib/auth/session";
import { listarPagosEscuela } from "@/services/pago.service";
import { listarJugadoresParaSelector } from "@/services/gestion-jugadores.service";
import { ESTADOS_PAGO } from "@/lib/validators/pago";
import { BandejaPagos } from "@/components/escuela/BandejaPagos";
import { RegistrarPagoEscuelaForm } from "@/components/escuela/RegistrarPagoEscuelaForm";

/**
 * Bandeja de validación de pagos. `REPORTADO` es la cola de trabajo real de la
 * escuela; el resto de las pestañas son historial de lo ya resuelto.
 */
export default async function PagosPage({
  searchParams,
}: {
  // Next 16: las APIs de request son asíncronas (AGENTS.md §2).
  searchParams: Promise<{ estado?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { estado: estadoParam, page: pageStr } = await searchParams;
  const estado = (ESTADOS_PAGO as readonly string[]).find((e) => e === estadoParam);
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const [pagos, jugadoresRes] = await Promise.all([
    listarPagosEscuela(ctx, { estado, page, limit: 20 }),
    listarJugadoresParaSelector(ctx),
  ]);

  const jugadores = jugadoresRes.map((j) => ({
    id: j.id,
    nombre: `${j.apellido}, ${j.nombre}`,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Pagos</h1>
      <p className="max-w-2xl text-sm text-muted">
        Los pagos que las familias reportan quedan acá <strong>en revisión</strong>{" "}
        hasta que los apruebes o rechaces. Lo que cobras directo (efectivo en la
        cancha) lo registras tú mismo y queda aprobado al instante.
      </p>

      <RegistrarPagoEscuelaForm jugadores={jugadores} />
      <BandejaPagos pagos={pagos} estadoActual={estado} />
    </div>
  );
}
