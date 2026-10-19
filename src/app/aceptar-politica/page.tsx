import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requirePanelUser } from "@/lib/auth/session";
import { obtenerEstadoPolitica } from "@/services/politica.service";
import { TextoPolitica, NotaVersionPolitica } from "@/components/legal/TextoPolitica";
import { AceptarPoliticaForm } from "@/components/auth/AceptarPoliticaForm";

export const metadata = {
  title: "Acepta la Política de Datos — Academia Élite",
  robots: { index: false, follow: false },
};

/**
 * Primer ingreso de la familia con cuenta creada por el alta asistida: la
 * Política se presenta y se acepta en línea antes de ver el panel.
 *
 * Es una ruta pública para el proxy (no cuelga de un prefijo de rol: si
 * estuviera bajo /jugador, el layout que la exige la redirigiría a sí misma en
 * bucle), así que la sesión se exige AQUÍ (Barrera 2) con el mismo guard que el
 * layout del panel: sin sesión va a /login, otro rol va a su panel, y una
 * cuenta que ya aceptó vuelve a /jugador. Familia bloqueada igual puede
 * aceptar (`permitirBloqueado`): el panel limitado la espera después.
 */
export default async function AceptarPoliticaPage() {
  const user = await requirePanelUser("JUGADOR", { permitirBloqueado: true });
  const politica = await obtenerEstadoPolitica(user.id);
  if (politica.aceptada) redirect("/jugador");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-8 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-subtle bg-surface p-5 sm:p-8">
        <header>
          <ShieldCheck className="h-8 w-8 text-pitch" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-pitch">
            Academia Élite
          </p>
          <h1 className="mt-1 font-display text-2xl italic uppercase sm:text-3xl">
            Antes de continuar
          </h1>
          <p className="mt-2 text-sm text-muted">
            Hola, {user.nombre}. Para entrar al panel de tu familia, lee la
            Política de Tratamiento de Datos y acéptala.
          </p>
          <NotaVersionPolitica className="mt-2" />
        </header>

        {/* Región con scroll y foco de teclado: sin tabIndex, quien navega con
            teclado no podría desplazar el texto. */}
        <section
          aria-label="Texto completo de la Política de Tratamiento de Datos"
          tabIndex={0}
          className="max-h-[50dvh] overflow-y-auto rounded-xl border border-subtle bg-base p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:p-6"
        >
          <TextoPolitica />
        </section>

        <AceptarPoliticaForm />
      </div>
    </main>
  );
}
