"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-pitch";

/**
 * Contraseña nueva + repetición, con botón para ver/ocultar. La coincidencia la
 * valida el servidor (el schema con `.refine`), pero el campo repetido evita el
 * error tipográfico y el ojo permite revisar lo que se escribió. Se usa en el
 * alta con código y en la vinculación; el mismo patrón vive en RecuperarForm.
 */
export function CamposPassword({
  etiqueta = "Contraseña (mín. 8)",
}: {
  etiqueta?: string;
}) {
  const [ver, setVer] = useState(false);
  const tipo = ver ? "text" : "password";
  return (
    <>
      <div>
        <label htmlFor="password" className="mb-1 block text-xs text-muted">
          {etiqueta}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={tipo}
            autoComplete="new-password"
            required
            minLength={8}
            className={`${input} pr-10`}
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirmacion" className="mb-1 block text-xs text-muted">
          Repetí la contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type={tipo}
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
        />
      </div>
    </>
  );
}
