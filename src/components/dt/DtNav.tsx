"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dt", label: "Plantilla" },
  { href: "/dt/solicitudes", label: "Solicitudes" },
];

export function DtNav({ solicitudes = 0 }: { solicitudes?: number }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-subtle">
      {LINKS.map((l) => {
        const active =
          l.href === "/dt" ? pathname === "/dt" : pathname.startsWith(l.href);
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
            {l.label === "Solicitudes" && solicitudes > 0 && (
              <span className="ml-2 rounded-full bg-alerta px-1.5 text-xs text-base">
                {solicitudes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
