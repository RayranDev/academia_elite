import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-subtle px-6 py-10 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-black italic uppercase text-foreground">
          Academia Elite
        </p>
        <p>Hecho para formar, no para rankear. Sin rankings entre niños.</p>
        <div className="flex items-center gap-4">
          <Link href="/legal" className="hover:text-foreground">
            Tratamiento de datos
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </footer>
  );
}
