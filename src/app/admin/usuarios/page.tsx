import { requireAuthContext } from "@/lib/auth/session";
import { listarUsuariosAdmin, listarEscuelasDropdown } from "@/services/admin-usuarios.service";
import { UsuariosGestion } from "@/components/gestion/UsuariosGestion";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    rol?: string;
    escuelaId?: string;
  }>;
}

export default async function UsuariosAdminPage({ searchParams }: PageProps) {
  const ctx = await requireAuthContext();
  const params = await searchParams;

  const q = params.q || "";
  const rol = params.rol || "";
  const escuelaId = params.escuelaId || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = Math.max(1, parseInt(params.limit || "10", 10));

  const [res, schools] = await Promise.all([
    listarUsuariosAdmin(ctx, {
      rol: rol || undefined,
      escuelaId: escuelaId || undefined,
      search: q || undefined,
      page,
      limit,
    }),
    listarEscuelasDropdown(ctx),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Usuarios</h1>
      <p className="text-sm text-muted">
        Gestión global de cuentas: edición, activación y reset de contraseñas.
        Todas las acciones quedan auditadas.
      </p>
      <UsuariosGestion
        usuarios={res.items}
        schools={schools}
        page={res.page}
        totalPages={res.totalPages}
        totalItems={res.total}
        limit={limit}
      />
    </div>
  );
}
