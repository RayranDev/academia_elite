import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerMiEscuela } from "@/services/escuela.service";
import { obtenerLandingAdmin } from "@/services/landing.service";
import { BrandingForm } from "@/components/escuela/BrandingForm";
import { EscudoUpload } from "@/components/escuela/EscudoUpload";
import { LandingForm } from "@/components/escuela/LandingForm";
import { Card } from "@/components/ui/Card";

export default async function BrandingPage() {
  const ctx = await requireAuthContext();
  const escuela = await obtenerMiEscuela(ctx);
  const landing = await obtenerLandingAdmin(ctx);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Branding</h1>
      <p className="text-sm text-muted">
        Personaliza el color y el escudo de tu escuela. El acento se aplica en
        todos los paneles de tu tenant (white-label).
      </p>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Escudo</h2>
        <EscudoUpload escuelaId={escuela.id} tieneEscudo={!!escuela.logoUrl} />
      </Card>

      <Card>
        <BrandingForm
          nombre={escuela.nombre}
          colorPrimario={escuela.colorPrimario}
          frecuenciaEvaluacionDias={escuela.frecuenciaEvaluacionDias}
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold">Landing pública</h2>
        <p className="mb-4 text-xs text-muted">
          Escaparate público de tu escuela (sin captura de datos). Vista previa:{" "}
          <Link
            href={`/e/${escuela.slug}`}
            target="_blank"
            className="text-brand underline"
          >
            /e/{escuela.slug}
          </Link>
        </p>
        <LandingForm landing={landing} />
      </Card>
    </div>
  );
}
