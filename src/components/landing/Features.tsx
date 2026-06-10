import { Reveal } from "@/components/landing/Reveal";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    titulo: "Evaluación 4 + 4 + 4",
    texto:
      "Cuatro pruebas físicas, cuatro técnicas y cuatro dimensiones de mentalidad. Datos reales, no opiniones.",
  },
  {
    titulo: "Sello MEN",
    texto:
      "La mentalidad como stat propio: actitud, concentración, trabajo en equipo y resiliencia. La marca de la casa.",
  },
  {
    titulo: "Evolución histórica",
    texto:
      "Cada evaluación es un snapshot inmutable. Compará al jugador solo consigo mismo, sin rankings entre niños.",
  },
  {
    titulo: "Logros con sentido",
    texto:
      "Insignias visuales y bonus reales con tope anti-inflación. El esfuerzo se premia, sin desbalancear la carta.",
  },
  {
    titulo: "Calendario y convocatorias",
    texto:
      "Partidos, entrenamientos y evaluaciones en un calendario. Los padres confirman asistencia con un toque.",
  },
  {
    titulo: "Multi-escuela y seguro",
    texto:
      "Cada academia ve solo sus datos. Protección de menores por diseño: fotos con consentimiento y sin chats adulto-niño.",
  },
];

export function Features() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch">
            Por qué funciona
          </p>
          <h2 className="mt-2 text-3xl font-black italic uppercase sm:text-4xl">
            Todo lo que tu academia necesita
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.titulo} delay={i * 0.05}>
              <Card className="h-full">
                <h3 className="text-lg font-black italic uppercase text-pitch">
                  {f.titulo}
                </h3>
                <p className="mt-2 text-sm text-muted">{f.texto}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
