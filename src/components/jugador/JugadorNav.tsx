"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/jugador", label: "Inicio" },
  { href: "/jugador/logros", label: "Logros" },
  { href: "/jugador/perfil", label: "Perfil" },
];

export function JugadorNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-subtle">
      {LINKS.map((l) => {
        const active =
          l.href === "/jugador"
            ? pathname === "/jugador"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-b-2 border-brand text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
