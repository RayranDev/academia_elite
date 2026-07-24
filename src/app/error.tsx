"use client"; // Los error boundaries deben ser Client Components.

import { useEffect } from "react";
import Link from "next/link";

/**
 * Degradación elegante ante un error inesperado en cualquier ruta.
 *
 * Nunca muestra el mensaje del error: en producción Next ya lo reemplaza por uno
 * genérico para no filtrar detalles del servidor (§5), y acá tampoco lo
 * renderizamos en desarrollo para que la pantalla se vea igual en ambos. Lo
 * único que se expone es `digest`, un hash que sirve para cruzar con los logs.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Queda en la consola del navegador para diagnóstico.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-2xl font-black italic uppercase">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted">
        Tuvimos un problema al cargar esta sección. Tus datos están a salvo:
        probá de nuevo y, si sigue pasando, avisanos.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-base"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="min-h-11 rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
        >
          Ir al inicio
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-muted">
          Código de referencia: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
