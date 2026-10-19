import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { obtenerEstadoPolitica } from "@/services/politica.service";
import { PanelShell } from "@/components/PanelShell";
import { AvisoVerificarEmail } from "@/components/auth/AvisoVerificarEmail";
import { navJugador } from "@/lib/nav/jugador";

export default async function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // permitirBloqueado: una familia bloqueada por mora igual puede entrar acá
  // (el layout compartido), pero solo llega a ver contenido en
  // /jugador/mensajes — las demás páginas siguen bloqueándose solas con su
  // propio requireAuthContext() sin el flag (ver AGENTS.md, PENDIENTES).
  const user = await requirePanelUser("JUGADOR", { permitirBloqueado: true });
  // Compuerta de la Política (primer ingreso de cuentas del alta asistida): se
  // lee de la base, no del JWT, que no se refresca al aceptar. La pantalla
  // vive FUERA de /jugador a propósito, o este layout la redirigiría a sí misma.
  const politica = await obtenerEstadoPolitica(user.id);
  if (!politica.aceptada) redirect("/aceptar-politica");

  const ctx = await requireAuthContext({ permitirBloqueado: true });
  const branding = await obtenerBrandingTenant(ctx);
  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;
  const escudoUrl = branding.tieneEscudo
    ? `/api/archivos/escudo/${branding.escuelaId}`
    : null;
  // Bloqueado: el menú se reduce a Mensajes y Pagos (ver `navJugador`).
  const nav = navJugador(user.bloqueado);

  return (
    <div style={brandStyle}>
      <PanelShell
        rol="JUGADOR"
        nombre={user.nombre}
        navItems={nav}
        base="/jugador"
        marca={branding.nombre}
        escudoUrl={escudoUrl}
      >
        <AvisoVerificarEmail />
        {children}
      </PanelShell>
    </div>
  );
}
