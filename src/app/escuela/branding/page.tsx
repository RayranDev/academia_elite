import Link from "next/link";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerMiEscuela } from "@/services/escuela.service";
import { obtenerLandingAdmin } from "@/services/landing.service";
import { actualizarBrandingAction } from "@/actions/escuela.actions";
import { EscudoUpload } from "@/components/escuela/EscudoUpload";
import { LandingForm } from "@/components/escuela/LandingForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

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
        <form action={actualizarBrandingAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">
              Nombre de la escuela
            </label>
            <input name="nombre" defaultValue={escuela.nombre} className={input} />
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">
                Color primario
              </label>
              <input
                name="colorPrimario"
                type="color"
                defaultValue={escuela.colorPrimario}
                className="h-10 w-20 cursor-pointer rounded border border-subtle bg-surface-2"
              />
            </div>
            <p className="pb-2 text-xs text-muted">
              Actual: <span className="font-mono">{escuela.colorPrimario}</span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">
              Frecuencia de evaluación (días)
            </label>
            <input
              name="frecuenciaEvaluacionDias"
              type="number"
              min={1}
              defaultValue={escuela.frecuenciaEvaluacionDias}
              className={input}
            />
          </div>

          <Button type="submit">Guardar branding</Button>
        </form>
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
