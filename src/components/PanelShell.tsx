import { Bell } from "lucide-react";
import { logout } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Sidebar, type NavItem } from "@/components/shell/Sidebar";
import { SplashScreen } from "@/components/shell/SplashScreen";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { getAuthContext } from "@/lib/auth/session";
import { contarMisNoLeidas } from "@/services/notificacion.service";
import type { Rol } from "@/types";

const ETIQUETA_ROL: Record<Rol, string> = {
  SUPER_ADMIN: "Súper Admin",
  ESCUELA_ADMIN: "Administrador de escuela",
  DT: "Director técnico",
  JUGADOR: "Jugador / Familia",
};

export async function PanelShell({
  rol,
  nombre,
  navItems,
  base,
  marca,
  escudoUrl,
  children,
}: {
  rol: Rol;
  nombre: string;
  navItems: NavItem[];
  base: string;
  marca?: string;
  escudoUrl?: string | null;
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  const noLeidas = ctx ? await contarMisNoLeidas(ctx) : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <SplashScreen marca={marca} />
      <header className="flex items-center justify-between border-b border-subtle bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {escudoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={escudoUrl}
              alt=""
              className="h-9 w-9 rounded-md object-contain"
            />
          ) : null}
          <div className="leading-tight">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {marca ?? "Fútbol Career Mode"}
            </p>
            <p className="text-xs text-muted">{ETIQUETA_ROL[rol]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          {noLeidas > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-brand/15 px-2 py-1 text-xs font-bold text-brand"
              title="Notificaciones sin leer"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {noLeidas}
            </span>
          )}
          <span className="hidden text-sm text-muted sm:inline">
            Hola, <span className="text-foreground">{nombre}</span>
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar items={navItems} base={base} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
