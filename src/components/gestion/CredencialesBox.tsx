/** Caja que muestra credenciales temporales UNA sola vez (presentacional). */
export function CredencialesBox({
  email,
  passwordTemporal,
}: {
  email: string;
  passwordTemporal: string;
}) {
  return (
    <div className="rounded-lg border border-subtle bg-surface-2 p-4 text-sm">
      <p className="text-muted">Email</p>
      <p className="font-mono font-semibold">{email}</p>
      <p className="mt-3 text-muted">Contraseña temporal</p>
      <p className="select-all font-mono text-lg font-bold text-brand">
        {passwordTemporal}
      </p>
      <p className="mt-3 text-xs text-alerta">
        Cópiala y compártela por un canal seguro. No se volverá a mostrar.
      </p>
    </div>
  );
}
