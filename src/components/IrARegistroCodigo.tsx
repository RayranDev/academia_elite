"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-pitch";

/** Lleva al formulario de alta de un hijo nuevo con el código de invitación. */
export function IrARegistroCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function ir(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c.length >= 4) router.push(`/registro/${encodeURIComponent(c)}`);
  }

  return (
    <form onSubmit={ir} className="space-y-3">
      <div>
        <label htmlFor="codigoInv" className="mb-1 block text-xs text-muted">
          Código de invitación
        </label>
        <input
          id="codigoInv"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className={input}
          placeholder="Ej.: ABCD2345"
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={codigo.trim().length < 4}>
        Continuar
      </Button>
    </form>
  );
}
