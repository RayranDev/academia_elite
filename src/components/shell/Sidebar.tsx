"use client";

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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Mapa de iconos: las claves (string) son serializables y se pueden pasar desde
// un Server Component (layout). Las funciones de icono viven aquí (cliente).
const ICONOS: Record<string, LucideIcon> = {
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
  cuenta: Settings,
};

export type IconKey = keyof typeof ICONOS;

export interface NavItem {
  href: string;
  label: string;
  icon: string; // clave de ICONOS
  badge?: number;
}

function esActivo(pathname: string, href: string, base: string): boolean {
  if (href === base) return pathname === base;
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ items, base }: { items: NavItem[]; base: string }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-subtle bg-surface/40 p-3 md:block">
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={esActivo(pathname, item.href, base)} />
          ))}
        </nav>
      </aside>

      <nav className="flex gap-1 overflow-x-auto border-b border-subtle bg-surface/40 p-2 md:hidden">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={esActivo(pathname, item.href, base)} compact />
        ))}
      </nav>
    </>
  );
}

function NavLink({
  item,
  active,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = ICONOS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        compact ? "shrink-0" : "",
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
