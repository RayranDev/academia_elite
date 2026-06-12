import { requireAuthContext } from "@/lib/auth/session";
import { CambiarPasswordForm } from "@/components/cuenta/CambiarPasswordForm";

export default async function CuentaPage() {
  await requireAuthContext();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Mi cuenta</h1>
      <CambiarPasswordForm />
    </div>
  );
}
