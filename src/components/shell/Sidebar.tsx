"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Tray,
  Buildings,
  SlidersHorizontal,
  Scroll,
  Stack,
  MapPin,
  Users,
  Ticket,
  Megaphone,
  Palette,
  UsersThree,
  CalendarDots,
  CalendarStar,
  ChatCircleDots,
  UserPlus,
  House,
  Medal,
  User,
  TrendUp,
  Flask,
  Image,
  ClipboardText,
  Trophy,
  Wallet,
  Receipt,
  Tag,
  Percent,
  Briefcase,
  Gear,
  CaretDown,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

// Mapa de iconos (Phosphor): las claves (string) son serializables y se pueden
// pasar desde un Server Component (layout). Las funciones de icono viven aquí
// (cliente). El ítem activo usa el peso "duotone" (ver `pesoIcono`).
export const ICONOS: Record<string, Icon> = {
  dashboard: SquaresFour,
  leads: Tray,
  escuelas: Buildings,
  parametros: SlidersHorizontal,
  auditoria: Scroll,
  categorias: Stack,
  sedes: MapPin,
  usuarios: Users,
  codigos: Ticket,
  anuncios: Megaphone,
  branding: Palette,
  plantilla: UsersThree,
  calendario: CalendarDots,
  // Listado de eventos (entrenamientos, partidos, evaluaciones): un calendario
  // con estrella, distinto del calendario que es por fecha.
  eventos: CalendarStar,
  mensajes: ChatCircleDots,
  solicitudes: UserPlus,
  inicio: House,
  logros: Medal,
  perfil: User,
  progreso: TrendUp,
  simulador: Flask,
  fondos: Image,
  asistencia: ClipboardText,
  ranking: Trophy,
  membresias: Wallet,
  pagos: Wallet,
  egresos: Receipt,
  precios: Tag,
  descuentos: Percent,
  staff: Briefcase,
  cuenta: Gear,
};

/** Activo = duotone (da profundidad sobre el fondo oscuro); inactivo = regular. */
export function pesoIcono(activo: boolean): "duotone" | "regular" {
  return activo ? "duotone" : "regular";
}

export type IconKey = keyof typeof ICONOS;

export interface NavItem {
  href: string;
  label: string;
  icon: string; // clave de ICONOS
  badge?: number;
  /** Sección visual (encabezado) en el aside de escritorio. Opcional. */
  grupo?: string;
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
  const IconoActivo = activo ? ICONOS[activo.icon] ?? SquaresFour : SquaresFour;
  const hayBadges = items.some((i) => (i.badge ?? 0) > 0);

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-subtle bg-surface/40 p-3 md:block">
        <nav className="flex flex-col gap-1">
          {items.map((item, i) => {
            // Encabezado de sección cuando arranca un grupo nuevo (C2.4).
            const nuevoGrupo =
              item.grupo && item.grupo !== items[i - 1]?.grupo;
            return (
              <div key={item.href}>
                {nuevoGrupo && (
                  <p
                    className={cn(
                      "px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted",
                      i > 0 && "pt-3",
                    )}
                  >
                    {item.grupo}
                  </p>
                )}
                <NavLink item={item} active={esActivo(pathname, item.href, base)} />
              </div>
            );
          })}
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
            <IconoActivo weight="duotone" className="h-4 w-4 shrink-0" aria-hidden />
            {activo?.label ?? "Menú"}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            {hayBadges && !abierto && (
              <span className="h-2 w-2 rounded-full bg-alerta" aria-hidden />
            )}
            Menú
            <CaretDown
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
  const Icon = ICONOS[item.icon] ?? SquaresFour;
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
      <Icon weight={pesoIcono(active)} className="h-4 w-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-alerta px-1.5 text-xs font-bold text-base">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
