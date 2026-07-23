"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICONOS, esActivo, type NavItem } from "@/components/shell/Sidebar";

/**
 * Barra inferior para el DT en móvil (PLAN-UX-DT PR-2 · B6). El DT usa la app en
 * cancha, de pie y con una mano: el pulgar llega abajo, no arriba. Muestra los 4
 * destinos principales y agrupa el resto en "Más". Targets ≥ 44px.
 */
const PRINCIPALES = ["/dt", "/dt/plantilla", "/dt/calendario", "/dt/mensajes"];

export function TabBarMovil({
  items,
  base,
}: {
  items: NavItem[];
  base: string;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  const principales = PRINCIPALES.map((href) =>
    items.find((i) => i.href === href),
  ).filter((i): i is NavItem => !!i);
  const resto = items.filter((i) => !PRINCIPALES.includes(i.href));
  const hayBadgeEnResto = resto.some((i) => (i.badge ?? 0) > 0);

  return (
    <>
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-overlay/50 md:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden
        />
      )}

      {abierto && (
        <nav
          id="tabbar-mas"
          className="fixed inset-x-0 bottom-16 z-50 max-h-[60dvh] overflow-y-auto border-t border-subtle bg-surface p-2 md:hidden"
        >
          {resto.map((item) => (
            <ItemMenu
              key={item.href}
              item={item}
              activo={esActivo(pathname, item.href, base)}
              onNavegar={() => setAbierto(false)}
            />
          ))}
        </nav>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-subtle bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {principales.map((item) => (
          <ItemTab
            key={item.href}
            item={item}
            activo={esActivo(pathname, item.href, base)}
            onNavegar={() => setAbierto(false)}
          />
        ))}
        <button
          type="button"
          onClick={() => setAbierto((o) => !o)}
          aria-expanded={abierto}
          aria-controls="tabbar-mas"
          className={cn(
            "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
            abierto ? "text-brand" : "text-muted",
          )}
        >
          {abierto ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          )}
          Más
          {hayBadgeEnResto && !abierto && (
            <span
              className="absolute right-[28%] top-2 h-2 w-2 rounded-full bg-alerta"
              aria-hidden
            />
          )}
        </button>
      </nav>
    </>
  );
}

function ItemTab({
  item,
  activo,
  onNavegar,
}: {
  item: NavItem;
  activo: boolean;
  onNavegar: () => void;
}) {
  const Icon = ICONOS[item.icon] ?? MoreHorizontal;
  return (
    <Link
      href={item.href}
      onClick={onNavegar}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
        activo ? "text-brand" : "text-muted",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {item.label}
      {item.badge != null && item.badge > 0 && (
        <span className="absolute right-[28%] top-2 h-2 w-2 rounded-full bg-alerta" aria-hidden />
      )}
    </Link>
  );
}

function ItemMenu({
  item,
  activo,
  onNavegar,
}: {
  item: NavItem;
  activo: boolean;
  onNavegar: () => void;
}) {
  const Icon = ICONOS[item.icon] ?? MoreHorizontal;
  return (
    <Link
      href={item.href}
      onClick={onNavegar}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
        activo ? "bg-brand/15 text-brand" : "text-muted hover:text-foreground",
      )}
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
