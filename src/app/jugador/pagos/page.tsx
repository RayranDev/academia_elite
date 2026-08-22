import { requireAuthContext } from "@/lib/auth/session";
import { cuotasReportables, misPagos } from "@/services/pago.service";
import { ReportarPagoForm } from "@/components/jugador/ReportarPagoForm";
import { HistorialPagos } from "@/components/jugador/HistorialPagos";

/**
 * Estado de cuenta y reporte de pagos. Accesible incluso con el acceso
 * bloqueado por mora (permitirBloqueado, igual que /jugador/mensajes): es
 * justamente la vía para salir del bloqueo, así que tiene que quedar
 * disponible para quien más la necesita.
 */
export default async function PagosPage() {
  const ctx = await requireAuthContext({ permitirBloqueado: true });
  const [cuotas, pagos] = await Promise.all([cuotasReportables(ctx), misPagos(ctx)]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Pagos</h1>
      <p className="max-w-2xl text-sm text-muted">
        Acá ves lo que debes y puedes reportar lo que pagaste. Un pago reportado
        queda <strong>en revisión</strong> hasta que la escuela lo confirme —
        mientras tanto, la cuota sigue como estaba.
      </p>
      <ReportarPagoForm cuotas={cuotas} />
      <HistorialPagos pagos={pagos} />
    </div>
  );
}
