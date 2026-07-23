import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Sidebar, type NavItem } from "@/components/shell/Sidebar";
import { TabBarMovil } from "@/components/shell/TabBarMovil";
import { SplashScreen } from "@/components/shell/SplashScreen";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { NotificacionesMenu } from "@/components/shell/NotificacionesMenu";
import { LoginNotifToast } from "@/components/shell/LoginNotifToast";
import { getAuthContext } from "@/lib/auth/session";
import { listarMisNotificaciones } from "@/services/notificacion.service";
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
  const notificaciones = ctx ? await listarMisNotificaciones(ctx) : [];
  // El DT trabaja en cancha, de pie y con una mano: barra inferior al alcance
  // del pulgar en vez del desplegable de arriba (PLAN-UX-DT PR-2 · B6).
  const conTabBar = rol === "DT";

  return (
    <div className="flex min-h-dvh flex-col">
      <SplashScreen marca={marca} />
      <LoginNotifToast notificaciones={notificaciones} />
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
              {marca ?? "Academia Elite"}
            </p>
            <p className="text-xs text-muted">{ETIQUETA_ROL[rol]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <NotificacionesMenu inicial={notificaciones} />
          <span className="hidden text-sm text-muted sm:inline">
            Hola, <span className="text-foreground">{nombre}</span>
          </span>
          {/* suppressHydrationWarning: algunas extensiones del navegador inyectan
              atributos en los <form> (p. ej. __gcruniqueid) antes de hidratar. */}
          <form action={logout} suppressHydrationWarning>
            <Button variant="ghost" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar items={navItems} base={base} ocultarMovil={conTabBar} />
        <main
          className={cn("flex-1 p-4 sm:p-6", conTabBar && "pb-20 md:pb-6")}
        >
          {children}
        </main>
      </div>

      {conTabBar && <TabBarMovil items={navItems} base={base} />}
    </div>
  );
}
