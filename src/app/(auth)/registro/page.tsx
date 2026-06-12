import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VincularHijoForm } from "@/components/VincularHijoForm";
import { IrARegistroCodigo } from "@/components/IrARegistroCodigo";

/**
 * Punto de entrada del registro de familias. Dos caminos:
 *  - El padre se vincula a un hijo YA creado por la escuela (código de escuela
 *    + código de jugador).
 *  - El padre registra a un hijo NUEVO con un código de invitación (queda
 *    PENDIENTE de evaluación, con su carta estándar).
 */
export default function RegistroIndexPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <VincularHijoForm />

      <Card className="w-full max-w-md">
        <div className="mb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-pitch">
            ¿Aún no está registrado?
          </p>
          <h2 className="mt-1 text-xl font-black italic uppercase">Registrar a mi hijo</h2>
          <p className="mt-1 text-xs text-muted">
            Si la escuela te dio un <b>código de invitación</b>, créale su perfil
            (quedará pendiente de evaluación).
          </p>
        </div>
        <IrARegistroCodigo />
      </Card>

      <Link href="/login" className="text-sm text-muted hover:text-foreground">
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
    </main>
  );
}
