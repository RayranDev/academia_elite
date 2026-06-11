import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { listarSolicitudesDt } from "@/services/jugador.service";
import { PanelShell } from "@/components/PanelShell";
import { DtNav } from "@/components/dt/DtNav";

export default async function DtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("DT");
  const ctx = await requireAuthContext();
  const [branding, solicitudes] = await Promise.all([
    obtenerBrandingTenant(ctx),
    listarSolicitudesDt(ctx),
  ]);

  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;

  return (
    <div style={brandStyle}>
      <PanelShell rol="DT" nombre={user.nombre}>
        <p className="mb-3 text-sm text-muted">
          {branding.nombre}
        </p>
        <DtNav solicitudes={solicitudes.length} />
        {children}
      </PanelShell>
    </div>
  );
}
