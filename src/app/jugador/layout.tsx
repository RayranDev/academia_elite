import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/shell/Sidebar";

const NAV: NavItem[] = [
  { href: "/jugador", label: "Inicio", icon: "inicio" },
  { href: "/jugador/mensajes", label: "Mensajes", icon: "mensajes" },
  { href: "/jugador/logros", label: "Logros", icon: "logros" },
  { href: "/jugador/progreso", label: "Progreso", icon: "progreso" },
  { href: "/jugador/perfil", label: "Perfil", icon: "perfil" },
];

export default async function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("JUGADOR");
  const ctx = await requireAuthContext();
  const branding = await obtenerBrandingTenant(ctx);
  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;
  const escudoUrl = branding.tieneEscudo
    ? `/api/archivos/escudo/${branding.escuelaId}`
    : null;

  return (
    <div style={brandStyle}>
      <PanelShell
        rol="JUGADOR"
        nombre={user.nombre}
        navItems={NAV}
        base="/jugador"
        marca={branding.nombre}
        escudoUrl={escudoUrl}
      >
        {children}
      </PanelShell>
    </div>
  );
}
