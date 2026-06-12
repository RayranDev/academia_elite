import { requireAuthContext } from "@/lib/auth/session";
import { listarCatalogoAdmin } from "@/services/logro.service";
import { LogrosAdmin } from "@/components/logros/LogrosAdmin";

export default async function LogrosAdminPage() {
  const ctx = await requireAuthContext();
  const logros = await listarCatalogoAdmin(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Logros</h1>
      <p className="text-sm text-muted">
        Catálogo global dividido por posición (POR/DEF/MED/DEL y generales).
        Los logros desactivados no se pueden otorgar ni aplican bonus.
      </p>
      <LogrosAdmin logros={logros} />
    </div>
  );
}
