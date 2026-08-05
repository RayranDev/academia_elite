import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import { AvisoVerificarEmail } from "@/components/auth/AvisoVerificarEmail";
import type { NavItem } from "@/components/shell/Sidebar";

const NAV: NavItem[] = [
  { href: "/jugador", label: "Inicio", icon: "inicio" },
  { href: "/jugador/calendario", label: "Calendario", icon: "calendario" },
  { href: "/jugador/mensajes", label: "Mensajes", icon: "mensajes" },
  { href: "/jugador/logros", label: "Logros", icon: "logros" },
  { href: "/jugador/fondos", label: "Fondos", icon: "fondos" },
  { href: "/jugador/progreso", label: "Progreso", icon: "progreso" },
  { href: "/jugador/perfil", label: "Perfil", icon: "perfil" },
  { href: "/jugador/cuenta", label: "Mi cuenta", icon: "cuenta" },
];

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
  const ctx = await requireAuthContext({ permitirBloqueado: true });
  const branding = await obtenerBrandingTenant(ctx);
  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;
  const escudoUrl = branding.tieneEscudo
    ? `/api/archivos/escudo/${branding.escuelaId}`
    : null;
  // Bloqueado: solo "Mensajes" en el nav, para no invitar a clickear
  // secciones que igual van a rebotar a /bloqueado.
  const nav = user.bloqueado
    ? NAV.filter((n) => n.href === "/jugador/mensajes")
    : NAV;

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
