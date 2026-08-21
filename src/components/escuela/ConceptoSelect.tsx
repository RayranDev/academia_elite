"use client";

// Acepta un `onChange` opcional, y una prop función NO es serializable a través
// del borde servidor → cliente. Sin esta directiva funciona igual mientras solo
// lo importen client components (entra en su bundle), pero el primer server
// component que lo renderice rompe el build — y el error le cae a quien agregue
// el quinto punto de uso, no a quien lo escribió.
import { CODIGO_MENSUALIDAD } from "@/lib/validators/concepto-cobro";
import type { ConceptoCobroDTO } from "@/services/concepto-cobro.service";

/**
 * `<select>` de conceptos de cobro. Existe para que las cuatro pantallas que
 * eligen un concepto (aranceles, edición de arancel, cobranza masiva, alta de
 * cuota) no repitan la resolución del default ni el nombre del campo.
 *
 * Manda el `id`, no el código: el catálogo es por escuela y el código solo es
 * único dentro del tenant.
 */
export function ConceptoSelect({
  id,
  conceptos,
  defaultValue,
  nombreArchivado,
  className,
  incluirTodos = false,
  onChange,
}: {
  id: string;
  conceptos: ConceptoCobroDTO[];
  /** Si no viene, gana la mensualidad de la escuela (o el primero del catálogo). */
  defaultValue?: string;
  /** Nombre a mostrar si `defaultValue` apunta a un concepto ya archivado. */
  nombreArchivado?: string;
  className?: string;
  /** Agrega la opción vacía "Todos" para los filtros de listado. */
  incluirTodos?: boolean;
  /** Solo lo usan los formularios que reaccionan al concepto elegido. */
  onChange?: (conceptoId: string) => void;
}) {
  const preferido =
    defaultValue ??
    conceptos.find((c) => c.codigo === CODIGO_MENSUALIDAD)?.id ??
    conceptos[0]?.id ??
    "";

  // La lista que llega son los conceptos ACTIVOS. Si estamos editando algo que
  // usa un concepto ya archivado, su `defaultValue` no matchea ninguna opción y
  // el navegador cae a la primera: guardar sin tocar este campo movería el
  // registro a OTRO concepto en silencio. Se lo agrega deshabilitado para que se
  // vea lo que hay y haya que elegir a conciencia para cambiarlo. Mismo criterio
  // que el `<select>` de estados en `MembresiasPanel`.
  const faltaElActual =
    defaultValue != null &&
    defaultValue !== "" &&
    !conceptos.some((c) => c.id === defaultValue);

  return (
    <select
      id={id}
      name="conceptoId"
      defaultValue={incluirTodos ? (defaultValue ?? "") : preferido}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={className}
    >
      {incluirTodos && <option value="">Todos los conceptos</option>}
      {faltaElActual && (
        <option value={defaultValue} disabled>
          {nombreArchivado ?? "Concepto archivado"}
        </option>
      )}
      {conceptos.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </select>
  );
}
