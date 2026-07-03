import Link from "next/link";

/**
 * Checkbox obligatorio de aceptación de la Política de Tratamiento de Datos
 * (habeas data). `required` valida en el cliente; el schema de registro exige el
 * valor "on" en el servidor. La aceptación se guarda con fecha y versión.
 */
export function AceptarTerminos() {
  return (
    <label className="flex items-start gap-2 text-xs text-muted">
      <input
        type="checkbox"
        name="aceptaTerminos"
        required
        className="mt-0.5 accent-[color:var(--brand)]"
      />
      <span>
        Como representante legal, autorizo el tratamiento de mis datos y los de mi
        hijo/a menor de edad conforme a la{" "}
        <Link
          href="/legal"
          target="_blank"
          className="font-semibold text-pitch hover:underline"
        >
          Política de Tratamiento de Datos y Habeas Data
        </Link>
        .
      </span>
    </label>
  );
}
