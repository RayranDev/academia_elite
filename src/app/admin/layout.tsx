import { requirePanelUser, getAuthContext } from "@/lib/auth/session";
import { obtenerSesionSoporteActual } from "@/services/soporte.service";
import { SoporteBanner } from "@/components/admin/SoporteBanner";
import { PanelShell } from "@/components/PanelShell";
import type { NavItem } from "@/components/shell/Sidebar";

const NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: "dashboard" },
  { href: "/admin/leads", label: "Leads", icon: "leads" },
  { href: "/admin/escuelas", label: "Escuelas", icon: "escuelas" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "usuarios" },
  { href: "/admin/logros", label: "Logros", icon: "logros" },
  { href: "/admin/fondos", label: "Fondos", icon: "fondos" },
  { href: "/admin/parametros", label: "Parámetros", icon: "parametros" },
  { href: "/admin/simulador", label: "Simulador", icon: "simulador" },
  { href: "/admin/auditoria", label: "Auditoría", icon: "auditoria" },
  { href: "/admin/cuenta", label: "Mi cuenta", icon: "cuenta" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("SUPER_ADMIN");
  const ctx = await getAuthContext();
  const soporte = ctx ? await obtenerSesionSoporteActual(ctx) : null;
  return (
    <PanelShell rol="SUPER_ADMIN" nombre={user.nombre} navItems={NAV} base="/admin">
      <SoporteBanner sesion={soporte} />
      {children}
    </PanelShell>
  );
}
