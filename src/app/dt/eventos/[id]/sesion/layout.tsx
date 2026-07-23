/**
 * El Modo Sesión ocupa la pantalla completa: sin sidebar, header ni tab bar. En
 * cancha, cada pixel de cromo es ruido.
 *
 * Este layout ANIDA bajo el de /dt, así que `PanelShell` lo sigue envolviendo
 * (y por eso el guard de rol DT sigue vigente, que es lo que queremos). Para
 * tapar el cromo sin romper esa cadena, el modo se monta como capa fija por
 * encima —incluida la tab bar móvil, que vive en z-50—.
 */
export default function SesionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-base">{children}</div>
  );
}
