"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marcarAsistenciaAction } from "@/actions/sesion.actions";

export type EstadoAsistencia = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";

export interface MarcaAsistencia {
  jugadorId: string;
  estado: EstadoAsistencia;
  llegoTarde: boolean;
  salioAntes: boolean;
}

const BACKOFF_MS = [1000, 3000, 8000];

/**
 * Asistencia con guardado optimista (PLAN-UX-DT PR-3 §3.3).
 *
 * En cancha la señal es irregular, así que el toque NO espera al servidor: la UI
 * se actualiza al instante y la marca entra en una cola que se procesa en serie.
 * Si falla, reintenta con backoff y queda pendiente; `pendientes` alimenta el
 * chip "sin sincronizar". La cola se persiste en sessionStorage para sobrevivir
 * un refresh: salir del modo nunca pierde datos.
 */
export function useAsistenciaOptimista(
  eventoId: string,
  inicial: Map<string, MarcaAsistencia>,
) {
  const [marcas, setMarcas] = useState<Map<string, MarcaAsistencia>>(inicial);
  const [pendientes, setPendientes] = useState(0);

  const cola = useRef<MarcaAsistencia[]>([]);
  const procesando = useRef(false);
  const claveStorage = `sesion:${eventoId}:cola`;

  const sincronizar = useCallback(() => {
    if (procesando.current) return;
    procesando.current = true;

    void (async () => {
      // Se refleja acá (y no en el efecto de rehidratación) para no llamar a
      // setState de forma síncrona dentro de un efecto.
      setPendientes(cola.current.length);
      while (cola.current.length > 0) {
        const marca = cola.current[0];
        let enviado = false;

        for (let intento = 0; intento <= BACKOFF_MS.length; intento++) {
          const res = await marcarAsistenciaAction({ eventoId, ...marca }).catch(
            () => ({ ok: false as const, error: "sin conexión" }),
          );
          if (res.ok) {
            enviado = true;
            break;
          }
          const espera = BACKOFF_MS[intento];
          if (espera === undefined) break;
          await new Promise((r) => setTimeout(r, espera));
        }

        // Se agotaron los reintentos: queda pendiente y se corta el bucle para
        // no quemar la batería reintentando en vano. Vuelve con el próximo toque.
        if (!enviado) break;

        cola.current.shift();
        setPendientes(cola.current.length);
        sessionStorage.setItem(claveStorage, JSON.stringify(cola.current));
      }
      procesando.current = false;
    })();
  }, [eventoId, claveStorage]);

  // Rehidrata lo que quedó sin sincronizar de una sesión anterior.
  useEffect(() => {
    const crudo = sessionStorage.getItem(claveStorage);
    if (!crudo) return;
    try {
      const guardadas = JSON.parse(crudo) as MarcaAsistencia[];
      if (guardadas.length === 0) return;
      cola.current = guardadas;
      // `sincronizar` publica el contador desde su async: no se toca estado
      // de forma síncrona dentro del efecto.
      sincronizar();
    } catch {
      sessionStorage.removeItem(claveStorage);
    }
  }, [claveStorage, sincronizar]);

  const marcar = useCallback(
    (marca: MarcaAsistencia) => {
      setMarcas((prev) => new Map(prev).set(marca.jugadorId, marca));
      // Una sola marca pendiente por jugador: el último toque manda.
      cola.current = [
        ...cola.current.filter((m) => m.jugadorId !== marca.jugadorId),
        marca,
      ];
      setPendientes(cola.current.length);
      sessionStorage.setItem(claveStorage, JSON.stringify(cola.current));
      sincronizar();
    },
    [claveStorage, sincronizar],
  );

  return { marcas, marcar, pendientes };
}
