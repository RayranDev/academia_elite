import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerMiEscuela } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/shell/Sidebar";

const NAV: NavItem[] = [
  { href: "/escuela", label: "Resumen", icon: "dashboard" },
  { href: "/escuela/jugadores", label: "Jugadores", icon: "plantilla" },
  { href: "/escuela/categorias", label: "Categorías", icon: "categorias" },
  { href: "/escuela/sedes", label: "Sedes", icon: "sedes" },
  { href: "/escuela/dts", label: "DTs", icon: "usuarios" },
  { href: "/escuela/codigos", label: "Códigos", icon: "codigos" },
  { href: "/escuela/anuncios", label: "Anuncios", icon: "anuncios" },
  { href: "/escuela/branding", label: "Branding", icon: "branding" },
  { href: "/escuela/cuenta", label: "Mi cuenta", icon: "cuenta" },
];

export default async function EscuelaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("ESCUELA_ADMIN");
  const ctx = await requireAuthContext();
  const escuela = await obtenerMiEscuela(ctx);

  const brandStyle = { ["--brand"]: escuela.colorPrimario } as CSSProperties;
  const escudoUrl = escuela.logoUrl
    ? `/api/archivos/escudo/${escuela.id}`
    : null;

  return (
    <div style={brandStyle}>
      <PanelShell
        rol="ESCUELA_ADMIN"
        nombre={user.nombre}
        navItems={NAV}
        base="/escuela"
        marca={escuela.nombre}
        escudoUrl={escudoUrl}
      >
        {children}
      </PanelShell>
    </div>
  );
}
