import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { panelPorRol, requireAuthContext } from "@/lib/auth/session";
import { obtenerEstadoBloqueo } from "@/services/cuenta.service";
import { mensajeDeBloqueo } from "@/lib/bloqueo";
import { logout } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import type { Rol } from "@/types";

/**
 * Pantalla que ve la familia con el acceso suspendido (G2). Requiere sesión
 * vigente; si el usuario no está bloqueado lo devuelve a su panel.
 *
 * La sesión se valida con el mismo guard que el resto de la app (usuario activo y
 * sin revocar): un JWT revocado o de un usuario desactivado no puede ver su mensaje
 * de bloqueo, va a /api/salir. `permitirBloqueado` evita el rebote a esta misma
 * página (bucle) para el usuario que justamente está bloqueado.
 */
export default async function BloqueadoPage() {
  const ctx = await requireAuthContext({ permitirBloqueado: true });

  const user = await obtenerEstadoBloqueo(ctx.userId);
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
        {/* suppressHydrationWarning: extensiones del navegador pueden inyectar
            atributos en el <form> (p. ej. __gcruniqueid) antes de hidratar. */}
        <form action={logout} className="mt-6" suppressHydrationWarning>
          <Button variant="ghost" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
