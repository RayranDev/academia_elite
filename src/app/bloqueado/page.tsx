import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { panelPorRol } from "@/lib/auth/session";
import { mensajeDeBloqueo } from "@/lib/bloqueo";
import { logout } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import type { Rol } from "@/types";

/**
 * Pantalla que ve la familia con el acceso suspendido (G2). Requiere sesión;
 * si el usuario no está bloqueado lo devuelve a su panel.
 */
export default async function BloqueadoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, bloqueado: true, bloqueoTipo: true, bloqueoMensaje: true },
  });
  if (!user) redirect("/api/salir");
  if (!user.bloqueado || user.rol !== "JUGADOR") {
    redirect(panelPorRol(user.rol as Rol));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-alerta" aria-hidden />
        <h1 className="mt-4 font-display text-2xl italic uppercase">
          Acceso suspendido
        </h1>
        <p className="mt-3 text-sm text-muted">
          {mensajeDeBloqueo(user.bloqueoTipo, user.bloqueoMensaje)}
        </p>
        <form action={logout} className="mt-6">
          <Button variant="ghost" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
