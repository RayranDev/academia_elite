import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

/**
 * Cabecera de la landing pública: marca + acceso + alternador de tema
 * claro/oscuro. Reutiliza el ThemeToggle del resto de la app (clase `light` en
 * <html> + localStorage `fcm-tema`, ya aplicada antes del primer pintado por el
 * script anti-FOUC del layout raíz), por lo que la preferencia persiste.
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-base/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-black italic uppercase tracking-tight">
          Academia <span className="text-pitch">Elite</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
