"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginacionProps {
  page: number;
  totalPages: number;
  totalItems: number;
}

export function Paginacion({ page, totalPages, totalItems }: PaginacionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function irAPagina(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm text-muted">
      <div>
        <span>Total: <span className="font-semibold text-foreground tabular">{totalItems}</span></span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => irAPagina(page - 1)}
          aria-label="Página anterior"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs">
          Página <span className="font-semibold text-foreground tabular">{page}</span> de{" "}
          <span className="font-semibold text-foreground tabular">{totalPages}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => irAPagina(page + 1)}
          aria-label="Página siguiente"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
