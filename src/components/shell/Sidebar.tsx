"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Building2,
  SlidersHorizontal,
  ScrollText,
  Layers,
  MapPin,
  Users,
  Ticket,
  Megaphone,
  Palette,
  CalendarDays,
  MessageSquare,
  UserPlus,
  Home,
  Medal,
  User,
  TrendingUp,
  FlaskConical,
  Settings,
  Image,
  ClipboardCheck,
  Trophy,
  Wallet,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Mapa de iconos: las claves (string) son serializables y se pueden pasar desde
// un Server Component (layout). Las funciones de icono viven aquí (cliente).
export const ICONOS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Inbox,
  escuelas: Building2,
  parametros: SlidersHorizontal,
  auditoria: ScrollText,
  categorias: Layers,
  sedes: MapPin,
  usuarios: Users,
  codigos: Ticket,
  anuncios: Megaphone,
  branding: Palette,
  plantilla: Users,
  calendario: CalendarDays,
  mensajes: MessageSquare,
  solicitudes: UserPlus,
  inicio: Home,
  logros: Medal,
  perfil: User,
  progreso: TrendingUp,
  simulador: FlaskConical,
  fondos: Image,
  asistencia: ClipboardCheck,
  ranking: Trophy,
  membresias: Wallet,
  cuenta: Settings,
};

export type IconKey = keyof typeof ICONOS;

export interface NavItem {
  href: string;
  label: string;
  icon: string; // clave de ICONOS
  badge?: number;
}

export function esActivo(pathname: string, href: string, base: string): boolean {
  if (href === base) return pathname === base;
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  items,
  base,
  ocultarMovil = false,
}: {
  items: NavItem[];
  base: string;
  /** El rol usa `TabBarMovil` abajo: no se duplica el desplegable de arriba. */
  ocultarMovil?: boolean;
}) {
  const pathname = usePathname();
  // El menú móvil se cierra al tocar una opción (onNavigate en cada NavLink).
  const [abierto, setAbierto] = useState(false);

  const activo =
    items.find((i) => esActivo(pathname, i.href, base)) ?? items[0];
  const IconoActivo = activo ? ICONOS[activo.icon] ?? LayoutDashboard : LayoutDashboard;
  const hayBadges = items.some((i) => (i.badge ?? 0) > 0);

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-subtle bg-surface/40 p-3 md:block">
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={esActivo(pathname, item.href, base)} />
          ))}
        </nav>
      </aside>

      {/* Móvil: la sección actual + botón "Menú" que despliega TODAS las opciones
          como botones claros. Antes era una tira que scrolleaba de costado sin
          ninguna pista de que había más. */}
      <div
        className={cn(
          "border-b border-subtle bg-surface/40 md:hidden",
          ocultarMovil && "hidden",
        )}
      >
        <button
          type="button"
          onClick={() => setAbierto((o) => !o)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        >
          <span className="flex items-center gap-2 text-foreground">
            <IconoActivo className="h-4 w-4 shrink-0" aria-hidden />
            {activo?.label ?? "Menú"}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            {hayBadges && !abierto && (
              <span className="h-2 w-2 rounded-full bg-alerta" aria-hidden />
            )}
            Menú
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", abierto && "rotate-180")}
              aria-hidden
            />
          </span>
        </button>

        {abierto && (
          <nav id="menu-movil" className="flex flex-col gap-1 border-t border-subtle p-2">
            {items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={esActivo(pathname, item.href, base)}
                onNavigate={() => setAbierto(false)}
              />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONOS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-brand/15 text-brand"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-alerta px-1.5 text-xs font-bold text-base">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
