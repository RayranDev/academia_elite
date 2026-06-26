"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { INDICATIVOS } from "@/lib/indicativos";
import { leadFormSchema } from "@/lib/validators/lead";

type Estado = "idle" | "enviando";
type Feedback = { tipo: "ok" | "error"; titulo: string; cuerpo: string } | null;
type Errores = Partial<Record<string, string>>;

const campoBase =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";
const campo = `${campoBase} w-full`;

export function LeadForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [codigoPais, setCodigoPais] = useState("+57");
  const [numero, setNumero] = useState("");
  // Momento de montaje: el endpoint descarta envíos < 2s (bots).
  const renderizadoEn = useRef(0);
  useEffect(() => {
    renderizadoEn.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const candidato = {
      nombreEscuela: String(fd.get("nombreEscuela") ?? ""),
      contactoNombre: String(fd.get("contactoNombre") ?? ""),
      contactoEmail: String(fd.get("contactoEmail") ?? ""),
      codigoPais,
      numeroTelefono: numero,
      ciudad: String(fd.get("ciudad") ?? ""),
      mensaje: String(fd.get("mensaje") ?? ""),
      website: String(fd.get("website") ?? ""), // honeypot
      renderizadoEn: renderizadoEn.current,
    };

    // Validación cliente con el MISMO schema que usa el servidor.
    const parsed = leadFormSchema.safeParse(candidato);
    if (!parsed.success) {
      const next: Errores = {};
      for (const issue of parsed.error.issues) {
        const campo = String(issue.path[0] ?? "");
        if (campo && !next[campo]) next[campo] = issue.message;
      }
      setErrores(next);
      return;
    }
    setErrores({});

    setEstado("enviando");
    const payload = parsed.data;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setFeedback({
          tipo: "ok",
          titulo: "¡Bienvenido a Academia Elite!",
          cuerpo:
            "Donde nacen las estrellas ⚽. Recibimos tus datos y muy pronto te contactaremos para mostrarte la plataforma con tus categorías.",
        });
        form.reset();
        setNumero("");
      } else if (res.status === 429) {
        setFeedback({
          tipo: "error",
          titulo: "Inténtalo en un momento",
          cuerpo:
            "Recibimos varias solicitudes desde tu red. Espera un momento y vuelve a enviar, o escríbenos directo y te atendemos enseguida.",
        });
      } else {
        setFeedback({
          tipo: "error",
          titulo: "Revisa tus datos",
          cuerpo:
            "Algún dato no quedó bien. Verifica el email y el teléfono (solo dígitos) e inténtalo de nuevo.",
        });
      }
    } catch {
      setFeedback({
        tipo: "error",
        titulo: "Sin conexión",
        cuerpo: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setEstado("idle");
    }
  }

  return (
    <section id="contacto" className="px-6 py-20">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch">
            Suma tu academia
          </p>
          <h2 className="mt-2 text-3xl font-black italic uppercase sm:text-4xl">
            Hablemos
          </h2>
          <p className="mt-3 text-muted">
            Déjanos tus datos y te mostramos la plataforma con tus categorías.
          </p>
        </div>

        <Card>
          {/* suppressHydrationWarning en el form y cada control: extensiones de
              autofill/gestores de contraseñas inyectan atributos (p. ej.
              __gcruniqueid) antes de hidratar y disparan un mismatch falso. */}
          <form onSubmit={onSubmit} className="space-y-4" suppressHydrationWarning>
            {/* Honeypot: invisible para humanos, tentador para bots */}
            <div className="hidden" aria-hidden>
              <label>
                No rellenar
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  suppressHydrationWarning
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="nombreEscuela"
                label="Nombre de la escuela"
                maxLength={50}
                error={errores.nombreEscuela}
                requerido
              />
              <Input
                name="contactoNombre"
                label="Tu nombre"
                maxLength={120}
                error={errores.contactoNombre}
                requerido
              />
              <Input
                name="contactoEmail"
                label="Email"
                type="email"
                error={errores.contactoEmail}
                requerido
              />
              <Input name="ciudad" label="Ciudad (opcional)" maxLength={80} />
            </div>

            {/* Teléfono OBLIGATORIO: indicativo (lista) + número (solo dígitos) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">
                Teléfono de contacto <span className="text-alerta">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Indicativo de país"
                  value={codigoPais}
                  onChange={(e) => setCodigoPais(e.target.value)}
                  className={`${campoBase} w-auto shrink-0`}
                  suppressHydrationWarning
                >
                  {INDICATIVOS.map((i) => (
                    <option key={i.codigo} value={i.codigo}>
                      {i.bandera} {i.codigo}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Número de teléfono"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="Número (solo dígitos)"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  aria-invalid={errores.numeroTelefono ? true : undefined}
                  className={`${campo} ${errores.numeroTelefono ? "border-alerta" : ""}`}
                  suppressHydrationWarning
                />
              </div>
              {errores.numeroTelefono && (
                <p className="mt-1 text-sm text-alerta">{errores.numeroTelefono}</p>
              )}
            </div>

            <div>
              <label htmlFor="mensaje" className="mb-1 block text-sm font-medium text-muted">
                Mensaje (opcional)
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={3}
                maxLength={100}
                aria-invalid={errores.mensaje ? true : undefined}
                className={`${campo} ${errores.mensaje ? "border-alerta" : ""}`}
                suppressHydrationWarning
              />
              {errores.mensaje && (
                <p className="mt-1 text-sm text-alerta">{errores.mensaje}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={estado === "enviando"}>
              {estado === "enviando" ? "Enviando…" : "Solicitar demo"}
            </Button>
          </form>
        </Card>
      </div>

      {/* Popup de resultado (éxito o error) */}
      <Modal
        open={feedback !== null}
        onClose={() => setFeedback(null)}
        title={feedback?.titulo}
      >
        <div className="space-y-4">
          <p className={feedback?.tipo === "ok" ? "text-pitch" : "text-foreground"}>
            {feedback?.cuerpo}
          </p>
          <Button className="w-full" onClick={() => setFeedback(null)}>
            {feedback?.tipo === "ok" ? "¡Genial!" : "Entendido"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function Input({
  name,
  label,
  type = "text",
  maxLength,
  error,
  requerido = false,
}: {
  name: string;
  label: string;
  type?: string;
  maxLength?: number;
  error?: string;
  requerido?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-muted">
        {label} {requerido && <span className="text-alerta">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${campo} ${error ? "border-alerta" : ""}`}
        suppressHydrationWarning
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-alerta">
          {error}
        </p>
      )}
    </div>
  );
}
