import { logout } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import type { Rol } from "@/types";

const ETIQUETA_ROL: Record<Rol, string> = {
  SUPER_ADMIN: "Súper Admin",
  ESCUELA_ADMIN: "Administrador de escuela",
  DT: "Director técnico",
  JUGADOR: "Jugador / Familia",
};

export function PanelShell({
  rol,
  nombre,
  children,
}: {
  rol: Rol;
  nombre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-subtle bg-surface px-6 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            Fútbol Career Mode
          </p>
          <p className="text-sm text-muted">{ETIQUETA_ROL[rol]}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            Hola, <span className="text-foreground">{nombre}</span>
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
