import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerMiEscuela } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import { EscuelaNav } from "@/components/escuela/EscuelaNav";

export default async function EscuelaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("ESCUELA_ADMIN");
  const ctx = await requireAuthContext();
  const escuela = await obtenerMiEscuela(ctx);

  // Inyecta el color de la escuela como variable --brand: tiñe los acentos
  // del panel (white-label, Sección 12.1).
  const brandStyle = { ["--brand"]: escuela.colorPrimario } as CSSProperties;

  return (
    <div style={brandStyle}>
      <PanelShell rol="ESCUELA_ADMIN" nombre={user.nombre}>
        <p className="mb-3 text-sm text-muted">
          Escuela:{" "}
          <span className="font-bold text-brand">{escuela.nombre}</span>
        </p>
        <EscuelaNav />
        {children}
      </PanelShell>
    </div>
  );
}
