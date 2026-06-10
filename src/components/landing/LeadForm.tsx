"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Estado = "idle" | "enviando" | "ok" | "error";

const campo =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-pitch";

export function LeadForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensaje, setMensaje] = useState("");
  // Momento de montaje: el endpoint descarta envíos < 2s (bots).
  const renderizadoEn = useRef(0);
  useEffect(() => {
    renderizadoEn.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEstado("enviando");
    const fd = new FormData(form);
    const payload = {
      nombreEscuela: fd.get("nombreEscuela"),
      contactoNombre: fd.get("contactoNombre"),
      contactoEmail: fd.get("contactoEmail"),
      telefono: fd.get("telefono"),
      ciudad: fd.get("ciudad"),
      mensaje: fd.get("mensaje"),
      website: fd.get("website"), // honeypot
      renderizadoEn: renderizadoEn.current,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEstado("ok");
        setMensaje("¡Gracias! Te contactaremos muy pronto.");
        form.reset();
      } else if (res.status === 429) {
        setEstado("error");
        setMensaje("Demasiadas solicitudes. Inténtalo más tarde.");
      } else {
        setEstado("error");
        setMensaje("Revisa los datos e inténtalo de nuevo.");
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo enviar. Revisa tu conexión.");
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
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Honeypot: invisible para humanos, tentador para bots */}
            <div className="hidden" aria-hidden>
              <label>
                No rellenar
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="nombreEscuela" label="Nombre de la escuela" required />
              <Input name="contactoNombre" label="Tu nombre" required />
              <Input
                name="contactoEmail"
                label="Email"
                type="email"
                required
              />
              <Input name="telefono" label="Teléfono (opcional)" />
              <Input name="ciudad" label="Ciudad (opcional)" />
            </div>

            <div>
              <label
                htmlFor="mensaje"
                className="mb-1 block text-sm font-medium text-muted"
              >
                Mensaje (opcional)
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={3}
                className={campo}
              />
            </div>

            {estado !== "idle" && estado !== "enviando" && (
              <p
                role="status"
                className={
                  estado === "ok" ? "text-sm text-pitch" : "text-sm text-alerta"
                }
              >
                {mensaje}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={estado === "enviando"}
            >
              {estado === "enviando" ? "Enviando…" : "Solicitar demo"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

function Input({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-muted"
      >
        {label}
      </label>
      <input id={name} name={name} type={type} required={required} className={campo} />
    </div>
  );
}
