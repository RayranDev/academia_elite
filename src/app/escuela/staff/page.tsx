import { requireAuthContext } from "@/lib/auth/session";
import { listarStaffEscuela } from "@/services/staff.service";
import { StaffPanel } from "@/components/escuela/StaffPanel";

export default async function StaffPage() {
  const ctx = await requireAuthContext();
  const staff = await listarStaffEscuela(ctx);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black italic uppercase">Staff</h1>
      <p className="max-w-2xl text-sm text-muted">
        El cuerpo técnico administrativo de la escuela: coordinador,
        preparador físico, utilero. Es una libreta de contactos, no crea
        cuentas de acceso al sistema.
      </p>
      <StaffPanel staff={staff} />
    </div>
  );
}
