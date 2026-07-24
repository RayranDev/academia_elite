/**
 * Muestra la versión que está corriendo (número + commit + fecha de build), para
 * que al reportar un problema se sepa exactamente sobre qué build ocurrió. Los
 * valores se inyectan en build (`NEXT_PUBLIC_*` en next.config.ts); en Vercel el
 * commit viene de `VERCEL_GIT_COMMIT_SHA`, en local dice "local".
 */
export function VersionInfo() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const commit = process.env.NEXT_PUBLIC_GIT_SHA ?? "local";
  const fecha = process.env.NEXT_PUBLIC_BUILD_DATE ?? "";

  return (
    <p className="mt-8 text-center text-xs text-muted">
      Academia Elite v{version} · build{" "}
      <span className="font-mono">{commit}</span>
      {fecha && ` · ${fecha}`}
    </p>
  );
}
