import { hayAcudiente, type AltaJugadorInput } from "@/lib/validators/alta-jugador";
import type { AlcanceAlta } from "@/lib/jugadores/alta";

/**
 * Resumen del paso "Confirmar" del alta de jugador. PURO: arma las filas que la
 * pantalla muestra antes de guardar, para probar qué se enseña y qué NO.
 *
 * Criterio sobre lo sensible: el resumen lo ve quien acaba de escribir los
 * datos, pero sigue siendo una pantalla —con la ficha de un menor— que puede
 * estar a la vista de otros. Por eso los datos de salud y el número de
 * documento se confirman como "cargados" (o enmascarados), no se repiten.
 */

export interface FilaResumen {
  etiqueta: string;
  valor: string;
}

export interface SeccionResumen {
  titulo: string;
  /** Índice del paso del formulario donde se edita esta sección. */
  paso: number;
  filas: FilaResumen[];
  /** Mensaje cuando la sección quedó sin datos (todo era opcional). */
  vacio?: string;
}

const ETIQUETA_POSICION: Record<string, string> = {
  POR: "Portero",
  DEF: "Defensa",
  MED: "Mediocampista",
  DEL: "Delantero",
};

const ETIQUETA_GENERO: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  X: "Prefiere no decirlo",
};

const FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Es un día de almanaque guardado como medianoche UTC: se lee en UTC.
  timeZone: "UTC",
});

/** Deja a la vista solo los últimos 4 caracteres: "••••6789". */
export function enmascarar(valor: string): string {
  const visibles = valor.slice(-4);
  return `${"•".repeat(Math.max(0, valor.length - 4))}${visibles}`;
}

export function etiquetaPosicion(codigo: string): string {
  return ETIQUETA_POSICION[codigo] ?? codigo;
}

export function resumenAlta(
  d: AltaJugadorInput,
  alcance: AlcanceAlta,
  categoriaNombre: string,
): SeccionResumen[] {
  const escuela = alcance === "ESCUELA";

  const jugador: FilaResumen[] = [
    { etiqueta: "Nombre", valor: `${d.nombre} ${d.apellido}` },
    { etiqueta: "Nacimiento", valor: FECHA.format(d.fechaNacimiento) },
    { etiqueta: "Posición", valor: etiquetaPosicion(d.posicion) },
    { etiqueta: "Categoría", valor: categoriaNombre },
  ];
  if (d.dorsal != null) jugador.push({ etiqueta: "Dorsal", valor: String(d.dorsal) });
  if (d.genero) jugador.push({ etiqueta: "Género", valor: ETIQUETA_GENERO[d.genero] ?? d.genero });
  if (escuela && (d.tipoDocumento || d.numeroDocumento)) {
    jugador.push({
      etiqueta: "Documento",
      valor: [d.tipoDocumento, d.numeroDocumento ? enmascarar(d.numeroDocumento) : null]
        .filter(Boolean)
        .join(" "),
    });
  }

  const ficha: FilaResumen[] = [];
  if (d.autorizaDatosSalud) {
    const cargados = [
      escuela && d.eps ? "EPS" : null,
      escuela && d.rh ? "RH" : null,
      d.alergias ? "alergias" : null,
      escuela && d.condicionesMedicas ? "condiciones médicas" : null,
      d.aptoMedicoVence ? `apto médico (vence ${FECHA.format(d.aptoMedicoVence)})` : null,
    ].filter(Boolean);
    ficha.push({ etiqueta: "Datos de salud", valor: "Autorizados por la familia" });
    ficha.push({
      etiqueta: "Se guardará",
      valor: cargados.length > 0 ? cargados.join(", ") : "Ningún dato de salud todavía",
    });
  }
  const contactoManual = Boolean(d.contactoEmergenciaNombre || d.contactoEmergenciaTelefono);
  if (contactoManual) {
    ficha.push({
      etiqueta: "Contacto de emergencia",
      valor: [
        d.contactoEmergenciaNombre,
        d.contactoEmergenciaParentesco ? `(${d.contactoEmergenciaParentesco})` : null,
        d.contactoEmergenciaTelefono,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  if (!contactoManual && d.contactoEsAcudiente && hayAcudiente(d)) {
    ficha.push({ etiqueta: "Contacto de emergencia", valor: "Los datos del acudiente" });
  }
  if (d.autorizaTraslado) {
    ficha.push({ etiqueta: "Traslado en caso de lesión", valor: "Autorizado" });
  }

  const acudiente: FilaResumen[] = [];
  if (hayAcudiente(d)) {
    acudiente.push({ etiqueta: "Nombre", valor: d.acudienteNombre ?? "" });
    acudiente.push({ etiqueta: "Correo (su usuario)", valor: d.acudienteEmail ?? "" });
    if (d.acudienteParentesco) acudiente.push({ etiqueta: "Parentesco", valor: d.acudienteParentesco });
    if (d.acudienteTelefono) acudiente.push({ etiqueta: "Teléfono", valor: d.acudienteTelefono });
    if (d.acudienteTipoDocumento || d.acudienteNumeroDocumento) {
      acudiente.push({
        etiqueta: "Documento",
        valor: [
          d.acudienteTipoDocumento,
          d.acudienteNumeroDocumento ? enmascarar(d.acudienteNumeroDocumento) : null,
        ]
          .filter(Boolean)
          .join(" "),
      });
    }
    if (d.acudienteDireccion) acudiente.push({ etiqueta: "Dirección", valor: d.acudienteDireccion });
  }

  return [
    { titulo: "Datos del jugador", paso: 0, filas: jugador },
    {
      titulo: "Ficha médica",
      paso: 1,
      filas: ficha,
      vacio: "Sin datos de ficha. La escuela puede completarla después.",
    },
    {
      titulo: "Acudiente",
      paso: 2,
      filas: acudiente,
      vacio:
        "Sin acudiente: la familia podrá vincularse después con el código del jugador, que verás al terminar.",
    },
  ];
}
