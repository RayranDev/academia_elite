import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { listarSolicitudesDt } from "@/services/jugador.service";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/shell/Sidebar";

export default async function DtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("DT");
  const ctx = await requireAuthContext();
  const [branding, solicitudes] = await Promise.all([
    obtenerBrandingTenant(ctx),
    listarSolicitudesDt(ctx),
  ]);

  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;
  const escudoUrl = branding.tieneEscudo
    ? `/api/archivos/escudo/${branding.escuelaId}`
    : null;

  const nav: NavItem[] = [
    { href: "/dt", label: "Plantilla", icon: "plantilla" },
    { href: "/dt/calendario", label: "Calendario", icon: "calendario" },
    { href: "/dt/logros", label: "Logros", icon: "logros" },
    { href: "/dt/mensajes", label: "Mensajes", icon: "mensajes" },
    {
      href: "/dt/solicitudes",
      label: "Solicitudes",
      icon: "solicitudes",
      badge: solicitudes.length,
    },
    { href: "/dt/cuenta", label: "Mi cuenta", icon: "cuenta" },
  ];

  return (
    <div style={brandStyle}>
      <PanelShell
        rol="DT"
        nombre={user.nombre}
        navItems={nav}
        base="/dt"
        marca={branding.nombre}
        escudoUrl={escudoUrl}
      >
        {children}
      </PanelShell>
    </div>
  );
}
