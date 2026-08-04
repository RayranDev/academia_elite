"use client"; // Los error boundaries deben ser Client Components.

/**
 * Último recurso: un error en el propio layout raíz. Reemplaza TODO el árbol, así
 * que tiene que traer sus `<html>`/`<body>` y sus estilos propios — no puede
 * contar con `globals.css` ni con los tokens del tema, porque el layout que los
 * inyecta es justamente el que falló. Por eso va con estilos inline.
 *
 * Igual que en `error.tsx`, nunca se muestra el mensaje del error: solo el
 * `digest` para poder cruzarlo con los logs.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0b1220",
          color: "#e5e7eb",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <title>Algo salió mal · Academia Elite</title>
        <p style={{ fontSize: "3rem", margin: 0 }} aria-hidden>
          ⚠️
        </p>
        <h1 style={{ fontSize: "1.5rem", margin: 0, fontStyle: "italic", textTransform: "uppercase" }}>
          Algo salió mal
        </h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "#94a3b8", margin: 0 }}>
          La aplicación no pudo cargar. Tus datos están a salvo. Prueba de nuevo y,
          si sigue pasando, avísanos.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            minHeight: "2.75rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#4ADE80",
            color: "#0b1220",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
            Código de referencia:{" "}
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{error.digest}</span>
          </p>
        )}
      </body>
    </html>
  );
}
