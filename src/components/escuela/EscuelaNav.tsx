"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/escuela", label: "Resumen" },
  { href: "/escuela/categorias", label: "Categorías" },
  { href: "/escuela/sedes", label: "Sedes" },
  { href: "/escuela/dts", label: "DTs" },
  { href: "/escuela/codigos", label: "Códigos" },
  { href: "/escuela/branding", label: "Branding" },
];

export function EscuelaNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-subtle">
      {LINKS.map((l) => {
        const active =
          l.href === "/escuela"
            ? pathname === "/escuela"
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
