import { requireAuthContext } from "@/lib/auth/session";
import { listarUsuariosAdmin } from "@/services/admin-usuarios.service";
import { UsuariosGestion } from "@/components/gestion/UsuariosGestion";

export default async function UsuariosAdminPage() {
  const ctx = await requireAuthContext();
  const usuarios = await listarUsuariosAdmin(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Usuarios</h1>
      <p className="text-sm text-muted">
        Gestión global de cuentas: edición, activación y reset de contraseñas.
        Todas las acciones quedan auditadas.
      </p>
      <UsuariosGestion usuarios={usuarios} />
    </div>
  );
}
