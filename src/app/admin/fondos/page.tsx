import { requireAuthContext } from "@/lib/auth/session";
import { listarFondosAdmin } from "@/services/fondo.service";
import { listarCatalogoAdmin } from "@/services/logro.service";
import { FondosAdmin } from "@/components/admin/FondosAdmin";

export default async function FondosAdminPage() {
  const ctx = await requireAuthContext();
  const [fondos, logros] = await Promise.all([
    listarFondosAdmin(ctx),
    listarCatalogoAdmin(ctx),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Fondos</h1>
      <p className="text-sm text-muted">
        Laboratorio de fondos de carta. Crea estilos y asígnalos a un requisito:
        disponibles para todos, ligados a un logro especial, o a un nivel de carta
        o personal. Exclusivo del Súper Admin.
      </p>
      <FondosAdmin
        fondos={fondos}
        logros={logros.map((l) => ({ codigo: l.codigo, nombre: l.nombre }))}
      />
    </div>
  );
}
