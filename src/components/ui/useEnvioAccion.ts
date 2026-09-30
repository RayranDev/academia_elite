"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";

/**
 * Envío imperativo de un formulario a una Server Action que devuelve
 * `ActionResult`: estado de carga, resultado y error listos para pintar.
 *
 * Por qué no `<form action>` + `useActionState` en todos lados: React 19
 * REINICIA los campos no controlados de un `<form action>` cuando la acción
 * termina, con éxito o con error. En un formulario largo (la tabla de
 * estadística de un partido) un error de validación borraría lo que el DT
 * acaba de cargar. Enviando con `onSubmit` + transición, los campos quedan
 * como están y solo cambia el mensaje. Es el mismo patrón de los diálogos de
 * crear/editar evento.
 */
export function useEnvioAccion<T>(
  accion: (formData: FormData) => Promise<ActionResult<T>>,
  opciones: { alExito?: (data: T | undefined, form: HTMLFormElement) => void } = {},
) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ActionResult<T> | undefined>();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // `currentTarget` se anula tras el primer await: se captura antes.
    const form = e.currentTarget;
    const formData = new FormData(form);
    iniciar(async () => {
      const res = await accion(formData);
      setResultado(res);
      if (res.ok) opciones.alExito?.(res.data, form);
    });
  }

  return {
    enviar,
    pendiente,
    resultado,
    exito: resultado?.ok ? resultado : undefined,
    error: resultado && !resultado.ok ? resultado.error : null,
    /** Borra el mensaje (p. ej. cuando el usuario vuelve a editar). */
    limpiar: () => setResultado(undefined),
  };
}
