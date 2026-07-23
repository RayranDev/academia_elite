import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerMiEscuela } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/shell/Sidebar";

// 11 ítems planos abrumaban: se agrupan en 3 secciones visuales (PR-5 · C2.4).
// Solo cambia la presentación (encabezados), no las rutas.
const NAV: NavItem[] = [
  { href: "/escuela", label: "Resumen", icon: "dashboard", grupo: "Deportivo" },
  { href: "/escuela/jugadores", label: "Jugadores", icon: "plantilla", grupo: "Deportivo" },
  { href: "/escuela/categorias", label: "Categorías", icon: "categorias", grupo: "Deportivo" },
  { href: "/escuela/asistencia", label: "Asistencia", icon: "asistencia", grupo: "Deportivo" },
  { href: "/escuela/ranking", label: "Ranking", icon: "ranking", grupo: "Deportivo" },
  { href: "/escuela/membresias", label: "Membresías", icon: "membresias", grupo: "Administración" },
  { href: "/escuela/dts", label: "DTs", icon: "usuarios", grupo: "Administración" },
  { href: "/escuela/codigos", label: "Códigos", icon: "codigos", grupo: "Administración" },
  { href: "/escuela/anuncios", label: "Anuncios", icon: "anuncios", grupo: "Club" },
  { href: "/escuela/branding", label: "Branding", icon: "branding", grupo: "Club" },
  { href: "/escuela/sedes", label: "Sedes", icon: "sedes", grupo: "Club" },
  { href: "/escuela/cuenta", label: "Mi cuenta", icon: "cuenta", grupo: "Club" },
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
