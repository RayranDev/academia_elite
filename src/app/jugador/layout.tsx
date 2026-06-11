import type { CSSProperties } from "react";
import { requirePanelUser, requireAuthContext } from "@/lib/auth/session";
import { obtenerBrandingTenant } from "@/services/escuela.service";
import { PanelShell } from "@/components/PanelShell";
import { JugadorNav } from "@/components/jugador/JugadorNav";

export default async function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("JUGADOR");
  const ctx = await requireAuthContext();
  const branding = await obtenerBrandingTenant(ctx);
  const brandStyle = { ["--brand"]: branding.colorPrimario } as CSSProperties;

  return (
    <div style={brandStyle}>
      <PanelShell rol="JUGADOR" nombre={user.nombre}>
        <p className="mb-3 text-sm text-muted">{branding.nombre}</p>
        <JugadorNav />
        {children}
      </PanelShell>
    </div>
  );
}
