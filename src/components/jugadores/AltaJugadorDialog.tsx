"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { crearJugadorCompletoAction } from "@/actions/alta-jugador.actions";
import {
  PASOS_ALTA,
  altaJugadorSchema,
  altaJugadorDesdeFormData,
  erroresDelPaso,
  erroresPorCampo,
  pasoDeCampo,
  type AltaJugadorInput,
  type ErroresAlta,
} from "@/lib/validators/alta-jugador";
import { TIPOS_DOCUMENTO, TIPOS_RH } from "@/lib/validators/gestion";
import { PARENTESCOS } from "@/lib/validators/cuenta";
import { TIPOS_DOCUMENTO_FISCAL } from "@/lib/validators/cuenta";
import { resumenAlta, etiquetaPosicion } from "@/lib/jugadores/resumen-alta";
import type { AlcanceAlta } from "@/lib/jugadores/alta";
import type { ResultadoAltaJugador } from "@/services/alta-jugador.service";
import { POSICIONES, GENEROS, ETIQUETA_GENERO } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MensajeAccion } from "@/components/ui/MensajeAccion";
import { CredencialesBox } from "@/components/gestion/CredencialesBox";
import { cn } from "@/lib/cn";
import { hoyISO } from "@/lib/fecha-calendario";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-alerta";

const TITULOS_PASO = [...PASOS_ALTA.map((p) => p.titulo), "Confirmar"];
const PASO_CONFIRMAR = PASOS_ALTA.length;

/**
 * Alta de un jugador con TODOS sus datos en un solo flujo: identidad, ficha
 * médica y administrativa, acudiente y confirmación. Lo usan el DT y la escuela
 * (`alcance`): el flujo es el mismo, cambia cuánto de la ficha se pide. El
 * servidor aplica ese mismo alcance por rol, así que ocultar un campo acá no es
 * la barrera de seguridad sino la cortesía.
 *
 * Diseño:
 *  - Un solo `<form>` con los tres pasos de captura SIEMPRE montados (los
 *    inactivos van `hidden`): lo escrito en un paso no se pierde al moverse, ni
 *    por un error del servidor. El envío es imperativo, sin reinicio de campos.
 *  - Validación en línea por paso con el MISMO schema del servidor, así los
 *    mensajes son idénticos y no hay reglas duplicadas.
 *  - Nada médico es obligatorio (HABEAS-DATA.md §6): los datos de salud exigen
 *    la autorización de la familia y, sin marcarla, sus campos quedan inertes.
 */
export function AltaJugadorDialog({
  categorias,
  alcance,
}: {
  categorias: { id: string; nombre: string }[];
  alcance: AlcanceAlta;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState<ErroresAlta>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [resumen, setResumen] = useState<AltaJugadorInput | null>(null);
  const [resultado, setResultado] = useState<ResultadoAltaJugador | null>(null);
  const [autorizaSalud, setAutorizaSalud] = useState(false);
  const [conAcudiente, setConAcudiente] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const escuela = alcance === "ESCUELA";

  // Al cambiar de paso el foco va al título del paso: sin esto, un lector de
  // pantalla no se entera de que la pantalla cambió.
  useEffect(() => {
    if (!abierto) return;
    // preventScroll + volver arriba a mano: el foco por defecto dejaba el diálogo
    // a mitad de camino y el indicador de pasos fuera de la vista.
    tituloRef.current?.focus({ preventScroll: true });
    tituloRef.current?.closest("[role='dialog']")?.scrollTo({ top: 0 });
  }, [paso, abierto, resultado]);

  // Tras una validación fallida, el foco va al primer campo con error.
  useEffect(() => {
    if (Object.keys(errores).length === 0) return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [errores]);

  function reiniciar() {
    formRef.current?.reset();
    setPaso(0);
    setErrores({});
    setErrorServidor(null);
    setResumen(null);
    setResultado(null);
    setAutorizaSalud(false);
    setConAcudiente(false);
    setSucio(false);
  }

  /** Cierra descartando lo cargado; pide confirmar si hay algo escrito. Un clic
   *  fuera del diálogo o Esc no deben tirar a la basura una ficha a medio llenar. */
  function intentarCerrar() {
    if (pendiente) return;
    if (resultado) return cerrar(true);
    if (sucio && !window.confirm("¿Descartar los datos cargados? Se perderá lo que escribiste.")) return;
    cerrar(false);
  }

  function cerrar(huboAlta: boolean) {
    setAbierto(false);
    if (huboAlta) router.refresh();
    // Se reinicia recién al cerrar: reabrir arranca limpio y sin parpadeo.
    reiniciar();
  }

  /** Lee y valida TODO el formulario con el schema del servidor. */
  function validar() {
    const form = formRef.current;
    if (!form) return null;
    const r = altaJugadorSchema.safeParse(altaJugadorDesdeFormData(new FormData(form)));
    return r.success
      ? { datos: r.data, errores: {} as ErroresAlta }
      : { datos: null, errores: erroresPorCampo(r.error.issues) };
  }

  function siguiente() {
    const v = validar();
    if (!v) return;
    const delPaso = erroresDelPaso(v.errores, paso);
    if (Object.keys(delPaso).length > 0) {
      setErrores(delPaso);
      return;
    }
    setErrores({});
    if (paso + 1 === PASO_CONFIRMAR) {
      // Llegando a confirmar, el resto de los pasos también tiene que estar bien.
      if (!v.datos) {
        const primerPaso = Math.min(...Object.keys(v.errores).map(pasoDeCampo).filter((n) => n >= 0));
        setErrores(v.errores);
        setPaso(primerPaso);
        return;
      }
      setResumen(v.datos);
    }
    setErrorServidor(null);
    setPaso(paso + 1);
  }

  function atras() {
    setErrores({});
    setErrorServidor(null);
    setPaso(Math.max(0, paso - 1));
  }

  function irAPaso(destino: number) {
    if (destino >= paso || pendiente) return;
    setErrores({});
    setErrorServidor(null);
    setPaso(destino);
  }

  function confirmar() {
    const form = formRef.current;
    const v = validar();
    if (!form || !v?.datos) {
      // No debería pasar (se validó al llegar), pero el servidor no es el único juez.
      if (v) {
        setErrores(v.errores);
        setPaso(Math.min(...Object.keys(v.errores).map(pasoDeCampo).filter((n) => n >= 0)));
      }
      return;
    }
    const formData = new FormData(form);
    setErrorServidor(null);
    iniciar(async () => {
      const res = await crearJugadorCompletoAction(formData);
      if (res.ok && res.data) setResultado(res.data);
      else if (!res.ok) setErrorServidor(res.error);
    });
  }

  function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (paso === PASO_CONFIRMAR) confirmar();
    else siguiente();
  }

  const categoriaNombre = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "";
  // Día de la escuela, no el del navegador ni el del servidor; solo con el diálogo
  // abierto (cliente), así que no hay desajuste de hidratación.
  const hoy = abierto ? hoyISO() : undefined;

  return (
    <>
      <Button onClick={() => setAbierto(true)} disabled={categorias.length === 0}>
        + Nuevo jugador
      </Button>

      <Modal
        open={abierto}
        onClose={intentarCerrar}
        title={resultado ? "Jugador creado" : "Nuevo jugador"}
        className="max-w-2xl"
      >
        {resultado ? (
          <Exito
            resultado={resultado}
            tituloRef={tituloRef}
            onOtro={reiniciar}
            onCerrar={() => cerrar(true)}
          />
        ) : (
          <form
            ref={formRef}
            onSubmit={alEnviar}
            onChange={(e) => {
              setSucio(true);
              // Un error deja de valer apenas el usuario toca ese campo.
              const t = e.target;
              const campo =
                t instanceof HTMLInputElement ||
                t instanceof HTMLSelectElement ||
                t instanceof HTMLTextAreaElement
                  ? t.name
                  : "";
              if (campo && errores[campo]) {
                setErrores(({ [campo]: _resuelto, ...resto }) => resto);
              }
            }}
            noValidate
            className="space-y-5"
          >
            <Indicador paso={paso} onIr={irAPaso} />

            <h3
              ref={tituloRef}
              tabIndex={-1}
              className="text-lg font-bold outline-none"
              aria-live="polite"
            >
              {`Paso ${paso + 1} de ${TITULOS_PASO.length}: ${TITULOS_PASO[paso]}`}
            </h3>

            {/* ── Paso 1 · Datos del jugador ── */}
            <section hidden={paso !== 0} className="space-y-4">
              <p className="text-xs text-muted">
                Los campos con <span aria-hidden>*</span>
                <span className="sr-only">asterisco</span> son obligatorios. Todo lo demás es opcional.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo nombre="nombre" etiqueta="Nombre" requerido error={errores.nombre}>
                  {(p) => <input {...p} name="nombre" autoComplete="off" maxLength={60} className={input} />}
                </Campo>
                <Campo nombre="apellido" etiqueta="Apellido" requerido error={errores.apellido}>
                  {(p) => <input {...p} name="apellido" autoComplete="off" maxLength={60} className={input} />}
                </Campo>
                <Campo nombre="fechaNacimiento" etiqueta="Fecha de nacimiento" requerido error={errores.fechaNacimiento}>
                  {(p) => <input {...p} name="fechaNacimiento" type="date" max={hoy} className={input} />}
                </Campo>
                <Campo nombre="posicion" etiqueta="Posición" requerido error={errores.posicion}>
                  {(p) => (
                    <select {...p} name="posicion" defaultValue="" className={input}>
                      <option value="">
                        Elige una posición
                      </option>
                      {POSICIONES.map((c) => (
                        <option key={c} value={c}>
                          {etiquetaPosicion(c)} ({c})
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo nombre="categoriaId" etiqueta="Categoría" requerido error={errores.categoriaId}>
                  {(p) => (
                    <select
                      {...p}
                      name="categoriaId"
                      defaultValue={categorias.length === 1 ? categorias[0].id : ""}
                      className={input}
                    >
                      <option value="">
                        Elige una categoría
                      </option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo nombre="dorsal" etiqueta="Dorsal" opcional error={errores.dorsal}>
                  {(p) => <input {...p} name="dorsal" type="number" min={1} max={100} className={input} />}
                </Campo>
                <Campo
                  nombre="genero"
                  etiqueta="Género"
                  opcional
                  error={errores.genero}
                  ayuda="Se declara, no se asume: déjalo sin especificar si no lo sabes."
                >
                  {(p) => (
                    // La opción vacía va primera y es la que queda por defecto.
                    <select {...p} name="genero" defaultValue="" className={input}>
                      <option value="">Sin especificar</option>
                      {GENEROS.map((g) => (
                        <option key={g} value={g}>
                          {ETIQUETA_GENERO[g]}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
              </div>

              {escuela && (
                <fieldset className="space-y-3 border-t border-subtle pt-4">
                  <legend className="text-sm font-bold">
                    Documento de identidad <span className="font-normal text-muted">(opcional)</span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo nombre="tipoDocumento" etiqueta="Tipo" opcional error={errores.tipoDocumento}>
                      {(p) => (
                        <select {...p} name="tipoDocumento" defaultValue="" className={input}>
                          <option value="">Sin especificar</option>
                          {TIPOS_DOCUMENTO.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                    </Campo>
                    <Campo nombre="numeroDocumento" etiqueta="Número" opcional error={errores.numeroDocumento}>
                      {(p) => <input {...p} name="numeroDocumento" maxLength={30} autoComplete="off" className={input} />}
                    </Campo>
                  </div>
                </fieldset>
              )}
            </section>

            {/* ── Paso 2 · Ficha médica ── */}
            <section hidden={paso !== 1} className="space-y-4">
              <div className="flex gap-2 rounded-lg border border-subtle bg-surface-2 p-3 text-xs text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <p>
                  <span className="font-semibold text-foreground">Todo este paso es opcional.</span>{" "}
                  Se pide para atender una urgencia en entrenamientos y partidos. Los datos de salud
                  son datos sensibles de un menor (Ley 1581 de 2012): solo se guardan con la
                  autorización de la familia y la escuela decide quién los ve.{" "}
                  {escuela
                    ? "El DT solo ve alergias, apto médico y contacto de emergencia."
                    : "Documento, EPS, RH y condiciones médicas los completa la escuela."}{" "}
                  Si la familia revoca la autorización, los datos se ocultan al instante.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-bold">Datos de salud</legend>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="autorizaDatosSalud"
                    checked={autorizaSalud}
                    onChange={(e) => setAutorizaSalud(e.target.checked)}
                    className="mt-1 accent-[color:var(--brand)]"
                  />
                  <span>
                    <span className="font-semibold">La familia autoriza el tratamiento de los datos de salud.</span>{" "}
                    Sin esta autorización, los campos de abajo no se guardan.
                  </span>
                </label>
                <fieldset disabled={!autorizaSalud} className="space-y-3 border-0 p-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {escuela && (
                      <>
                        <Campo nombre="eps" etiqueta="EPS" opcional error={errores.eps}>
                          {(p) => <input {...p} name="eps" maxLength={80} autoComplete="off" className={input} />}
                        </Campo>
                        <Campo nombre="rh" etiqueta="RH (tipo de sangre)" opcional error={errores.rh}>
                          {(p) => (
                            <select {...p} name="rh" defaultValue="" className={input}>
                              <option value="">Sin especificar</option>
                              {TIPOS_RH.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
                        </Campo>
                      </>
                    )}
                    <Campo nombre="aptoMedicoVence" etiqueta="El apto médico vence" opcional error={errores.aptoMedicoVence}>
                      {(p) => <input {...p} name="aptoMedicoVence" type="date" className={input} />}
                    </Campo>
                    <div className="sm:col-span-2">
                      <Campo nombre="alergias" etiqueta="Alergias" opcional error={errores.alergias}>
                        {(p) => <textarea {...p} name="alergias" rows={2} maxLength={300} className={input} />}
                      </Campo>
                    </div>
                    {escuela && (
                      <div className="sm:col-span-2">
                        <Campo nombre="condicionesMedicas" etiqueta="Condiciones médicas" opcional error={errores.condicionesMedicas}>
                          {(p) => <textarea {...p} name="condicionesMedicas" rows={2} maxLength={300} className={input} />}
                        </Campo>
                      </div>
                    )}
                  </div>
                </fieldset>
                {!autorizaSalud && (
                  <p className="text-xs text-muted">
                    Marca la autorización para poder cargar estos datos.
                  </p>
                )}
              </fieldset>

              <fieldset className="space-y-3 border-t border-subtle pt-4">
                <legend className="text-sm font-bold">Contacto de emergencia</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo nombre="contactoEmergenciaNombre" etiqueta="Nombre" opcional error={errores.contactoEmergenciaNombre}>
                    {(p) => <input {...p} name="contactoEmergenciaNombre" maxLength={60} autoComplete="off" className={input} />}
                  </Campo>
                  <Campo nombre="contactoEmergenciaTelefono" etiqueta="Teléfono" opcional error={errores.contactoEmergenciaTelefono}>
                    {(p) => <input {...p} name="contactoEmergenciaTelefono" type="tel" maxLength={30} autoComplete="off" className={input} />}
                  </Campo>
                  <Campo nombre="contactoEmergenciaParentesco" etiqueta="Parentesco" opcional error={errores.contactoEmergenciaParentesco}>
                    {(p) => (
                      <select {...p} name="contactoEmergenciaParentesco" defaultValue="" className={input}>
                        <option value="">Sin especificar</option>
                        {PARENTESCOS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="autorizaTraslado"
                    className="mt-1 accent-[color:var(--brand)]"
                  />
                  Autoriza a la escuela a trasladar al jugador en caso de lesión.
                </label>
              </fieldset>
            </section>

            {/* ── Paso 3 · Acudiente ── */}
            <section hidden={paso !== 2} className="space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={conAcudiente}
                  onChange={(e) => {
                    setConAcudiente(e.target.checked);
                    setErrores({});
                  }}
                  className="mt-1 accent-[color:var(--brand)]"
                />
                <span>
                  <span className="font-semibold">Registrar al acudiente ahora</span>
                  <span className="block text-xs text-muted">
                    Es opcional. Sin acudiente, la familia podrá vincularse después con el código
                    del jugador, que verás al terminar.
                  </span>
                </span>
              </label>

              {/* Desactivado y oculto, no desmontado: lo escrito se conserva si se
                  vuelve a activar, y no viaja en el envío mientras esté apagado. */}
              <fieldset disabled={!conAcudiente} hidden={!conAcudiente} className="space-y-4 border-0 p-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo nombre="acudienteNombre" etiqueta="Nombre completo" requerido error={errores.acudienteNombre}>
                    {(p) => <input {...p} name="acudienteNombre" maxLength={120} autoComplete="off" className={input} />}
                  </Campo>
                  <Campo
                    nombre="acudienteEmail"
                    etiqueta="Correo"
                    requerido
                    error={errores.acudienteEmail}
                    ayuda="Es el usuario con el que la familia ingresa a la plataforma."
                  >
                    {(p) => <input {...p} name="acudienteEmail" type="email" autoComplete="off" className={input} />}
                  </Campo>
                  <Campo nombre="acudienteTelefono" etiqueta="Teléfono" opcional error={errores.acudienteTelefono}>
                    {(p) => <input {...p} name="acudienteTelefono" type="tel" maxLength={30} autoComplete="off" className={input} />}
                  </Campo>
                  <Campo nombre="acudienteParentesco" etiqueta="Parentesco con el jugador" opcional error={errores.acudienteParentesco}>
                    {(p) => (
                      <select {...p} name="acudienteParentesco" defaultValue="" className={input}>
                        <option value="">Sin especificar</option>
                        {PARENTESCOS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                </div>

                <fieldset className="space-y-3 border-t border-subtle pt-4">
                  <legend className="text-sm font-bold">
                    Datos de facturación <span className="font-normal text-muted">(opcional)</span>
                  </legend>
                  <p className="text-xs text-muted">
                    Quien paga es el acudiente, no el jugador. Hoy la plataforma no emite factura
                    electrónica: se guardan solo para no tener que pedirlos después.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo nombre="acudienteTipoDocumento" etiqueta="Tipo de documento" opcional error={errores.acudienteTipoDocumento}>
                      {(p) => (
                        <select {...p} name="acudienteTipoDocumento" defaultValue="" className={input}>
                          <option value="">Sin especificar</option>
                          {TIPOS_DOCUMENTO_FISCAL.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                    </Campo>
                    <Campo nombre="acudienteNumeroDocumento" etiqueta="Número" opcional error={errores.acudienteNumeroDocumento}>
                      {(p) => <input {...p} name="acudienteNumeroDocumento" maxLength={20} autoComplete="off" className={input} />}
                    </Campo>
                    <div className="sm:col-span-2">
                      <Campo nombre="acudienteDireccion" etiqueta="Dirección" opcional error={errores.acudienteDireccion}>
                        {(p) => <input {...p} name="acudienteDireccion" maxLength={200} autoComplete="off" className={input} />}
                      </Campo>
                    </div>
                  </div>
                </fieldset>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="contactoEsAcudiente"
                    aria-invalid={errores.contactoEsAcudiente ? true : undefined}
                    className="mt-1 accent-[color:var(--brand)]"
                  />
                  <span>
                    Usar estos datos como contacto de emergencia
                    <span className="block text-xs text-muted">
                      Completa solo lo que dejaste vacío en el contacto del paso anterior.
                    </span>
                  </span>
                </label>

                <div className="space-y-1">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="acudienteAutoriza"
                      aria-invalid={errores.acudienteAutoriza ? true : undefined}
                      aria-describedby="error-acudienteAutoriza"
                      className="mt-1 accent-[color:var(--brand)]"
                    />
                    <span>
                      <span className="font-semibold">
                        El acudiente autoriza el tratamiento de sus datos y los del menor.
                      </span>{" "}
                      Confirmo que conoce la Política de Tratamiento de Datos de la plataforma.
                      <span aria-hidden> *</span>
                    </span>
                  </label>
                  {errores.acudienteAutoriza && (
                    <p id="error-acudienteAutoriza" className="text-xs font-semibold text-alerta">
                      {errores.acudienteAutoriza}
                    </p>
                  )}
                </div>

                <p className="rounded-lg border border-subtle bg-surface-2 p-3 text-xs text-muted">
                  Se crea la cuenta del acudiente con una contraseña temporal que verás{" "}
                  <span className="font-semibold text-foreground">una sola vez</span> al terminar.
                  Si ya tiene cuenta en la escuela (por ejemplo, otro hijo), el jugador se vincula a
                  esa cuenta.
                </p>
              </fieldset>
            </section>

            {/* ── Paso 4 · Confirmar ── */}
            {paso === PASO_CONFIRMAR && resumen && (
              <section className="space-y-4">
                <p className="text-sm text-muted">
                  Revisa los datos antes de crear al jugador. Puedes volver a cualquier paso para corregir.
                </p>
                {resumenAlta(resumen, alcance, categoriaNombre(resumen.categoriaId)).map((s) => (
                  <div key={s.titulo} className="rounded-lg border border-subtle p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">{s.titulo}</h4>
                      <button
                        type="button"
                        onClick={() => irAPaso(s.paso)}
                        disabled={pendiente}
                        className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        Editar
                      </button>
                    </div>
                    {s.filas.length === 0 ? (
                      <p className="text-xs text-muted">{s.vacio}</p>
                    ) : (
                      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
                        {s.filas.map((f) => (
                          <div key={f.etiqueta + f.valor} className="contents">
                            <dt className="text-muted">{f.etiqueta}</dt>
                            <dd className="font-medium">{f.valor}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
                <MensajeAccion error={errorServidor} />
              </section>
            )}

            {/* Pegado al borde inferior del diálogo: con la ficha completa el formulario
                supera la pantalla y Siguiente/Crear no pueden quedar fuera de la vista. */}
            <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-2 border-t border-subtle bg-surface px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={paso === 0 ? intentarCerrar : atras}
                disabled={pendiente}
              >
                {paso === 0 ? (
                  "Cancelar"
                ) : (
                  <>
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                    Atrás
                  </>
                )}
              </Button>
              {paso < PASO_CONFIRMAR ? (
                <Button type="submit">
                  {paso === PASO_CONFIRMAR - 1 ? "Revisar" : "Siguiente"}
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button type="submit" disabled={pendiente} aria-busy={pendiente}>
                  {pendiente ? "Creando jugador…" : "Crear jugador"}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/** Indicador de pasos: los anteriores son botones para volver; el actual, `aria-current`. */
function Indicador({ paso, onIr }: { paso: number; onIr: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-1 text-xs font-semibold" aria-label="Pasos del alta">
      {TITULOS_PASO.map((titulo, i) => {
        const hecho = i < paso;
        const actual = i === paso;
        return (
          <li key={titulo} className="flex min-w-0 flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => onIr(i)}
              disabled={!hecho}
              aria-current={actual ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors",
                actual && "border-brand bg-brand/10 text-brand",
                hecho && "border-pitch/40 text-pitch hover:bg-pitch/10",
                !actual && !hecho && "border-subtle text-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                  actual && "bg-brand text-base",
                  hecho && "bg-pitch text-base",
                  !actual && !hecho && "bg-surface-2",
                )}
              >
                {hecho ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              <span className={cn("truncate", !actual && "hidden sm:inline")}>{titulo}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface PropsCampo {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-required"?: true;
}

/** Campo con etiqueta, marca de obligatorio/opcional, ayuda y error asociados. */
function Campo({
  nombre,
  etiqueta,
  requerido,
  opcional,
  ayuda,
  error,
  children,
}: {
  nombre: string;
  etiqueta: string;
  requerido?: boolean;
  opcional?: boolean;
  ayuda?: string;
  error?: string;
  children: (props: PropsCampo) => React.ReactNode;
}) {
  const base = useId();
  const id = `${base}-${nombre}`;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {etiqueta}
        {requerido && <span aria-hidden> *</span>}
        {opcional && <span className="ml-1 text-[11px]">(opcional)</span>}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [idAyuda, idError].filter(Boolean).join(" ") || undefined,
        "aria-required": requerido ? true : undefined,
      })}
      {ayuda && (
        <p id={idAyuda} className="mt-1 text-[11px] leading-snug text-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1 text-xs font-semibold text-alerta">
          {error}
        </p>
      )}
    </div>
  );
}

/** Estado de éxito: qué se creó, el código de vinculación y, una sola vez, las credenciales. */
function Exito({
  resultado,
  tituloRef,
  onOtro,
  onCerrar,
}: {
  resultado: ResultadoAltaJugador;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
  onOtro: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="space-y-4" role="status">
      <h3 ref={tituloRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-bold text-pitch outline-none">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
        {resultado.nombreCompleto} ya está en la plantilla.
      </h3>
      <ul className="space-y-1 text-sm text-muted">
        <li>
          {resultado.fichaCargada
            ? resultado.saludGuardada
              ? "Se guardó la ficha, con los datos de salud autorizados."
              : "Se guardó la ficha (sin datos de salud: no hubo autorización)."
            : "Sin datos de ficha: se pueden completar después."}
        </li>
        {resultado.codigoJugador && (
          <li>
            Código del jugador:{" "}
            <span className="select-all font-mono font-semibold text-foreground">
              {resultado.codigoJugador}
            </span>
            {!resultado.familia && " (la familia lo usa para vincularse)."}
          </li>
        )}
      </ul>

      {resultado.familia?.tipo === "CREADA" && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Cuenta del acudiente creada</p>
          <CredencialesBox
            email={resultado.familia.email}
            passwordTemporal={resultado.familia.passwordTemporal}
          />
        </div>
      )}
      {resultado.familia?.tipo === "VINCULADA" && (
        <p className="rounded-lg border border-subtle bg-surface-2 p-3 text-sm">
          {resultado.familia.nombre} ya tenía cuenta en la escuela: el jugador quedó vinculado a
          <span className="font-mono"> {resultado.familia.email}</span>. No se generó una contraseña nueva.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-subtle pt-4">
        <Button type="button" variant="secondary" onClick={onOtro}>
          Crear otro jugador
        </Button>
        <Button type="button" onClick={onCerrar}>
          Listo
        </Button>
      </div>
    </div>
  );
}
