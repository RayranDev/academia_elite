import { HeroIlustracion } from "@/components/landing/HeroIlustracion";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Trophy,
  Building2,
  MapPin,
  Mail,
  MessageCircle,
  AtSign,
} from "lucide-react";
import { obtenerLandingPublica } from "@/services/landing.service";
import type {
  LandingPublicaDTO,
  CategoriaPublicaDTO,
  SedePublicaDTO,
} from "@/lib/mappers/landing-publica";

/**
 * Landing pública de una escuela (`/e/[slug]`): escaparate + contacto, SIN
 * formularios ni captura de leads. Ruta pública a propósito (no está bajo
 * `/admin`, `/escuela`, `/dt` ni `/jugador`: `src/proxy.ts` solo protege esos
 * prefijos, así que esta ya es alcanzable sin sesión — ver el comentario en
 * `PREFIJO_ROL` de ese archivo).
 *
 * `cache()` memoiza la consulta entre `generateMetadata` y el componente de
 * página: ambos corren en el mismo request y piden el mismo slug (Sección
 * "Memoizing data requests" de la doc de metadata de Next 16).
 *
 * Sin `generateStaticParams` ni Request-time APIs (cookies/headers/searchParams),
 * esta ruta calificaría para el modelo "estático" clásico: se renderiza en el
 * primer request y ESE HTML queda servido para siempre desde el Full Route
 * Cache, sin volver a ejecutar `obtenerLandingPublica`. Eso rompería la
 * visibilidad por `activa`/`landingPublicada`: el SUPER_ADMIN desactiva una
 * escuela (§5 AGENTS.md, Barrera 2) y esta página seguiría sirviendo la
 * vitrina vieja indefinidamente, porque ninguna de las acciones que tocan esos
 * campos (`editarEscuelaSuperAdmin`, branding, categorías, sedes, escudo)
 * revalida `/e/[slug]`. `force-dynamic` hace que Barrera 2 se evalúe en CADA
 * request, como en el resto de la app.
 */
export const dynamic = "force-dynamic";

const getLanding = cache((slug: string) => obtenerLandingPublica(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resultado = await getLanding(slug);

  if (resultado.estado === "no-encontrada") return {};

  if (resultado.estado === "en-construccion") {
    return {
      title: `${resultado.nombre} — Página en construcción`,
      // La escuela todavía no publicó su landing: que no la indexen buscadores.
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${resultado.data.nombre} — Fútbol Career Mode`,
    description:
      resultado.data.titular ?? `Conoce la propuesta de ${resultado.data.nombre}.`,
  };
}

export default async function LandingPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resultado = await getLanding(slug);

  if (resultado.estado === "no-encontrada") notFound();

  if (resultado.estado === "en-construccion") {
    return <EnConstruccion slug={slug} {...resultado} />;
  }

  const { data } = resultado;
  const brandStyle = { ["--brand"]: data.colorPrimario } as CSSProperties;

  return (
    <div style={brandStyle} className="flex min-h-dvh flex-col">
      <Header data={data} slug={slug} />
      <main className="flex-1">
        <HeroSeccion data={data} />
        <ValoresStrip />
        {data.categorias.length > 0 && <Programas categorias={data.categorias} />}
        {data.sedes.length > 0 && <Instalaciones sedes={data.sedes} />}
        <Contacto data={data} />
      </main>
      <Footer nombre={data.nombre} />
    </div>
  );
}

function EnConstruccion({
  slug,
  nombre,
  tieneEscudo,
  colorPrimario,
}: {
  slug: string;
  nombre: string;
  tieneEscudo: boolean;
  colorPrimario: string;
}) {
  const brandStyle = { ["--brand"]: colorPrimario } as CSSProperties;
  return (
    <div
      style={brandStyle}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      {tieneEscudo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/archivos/escudo-publico/${slug}`}
          alt=""
          className="h-16 w-16 rounded-lg object-contain"
        />
      )}
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">{nombre}</p>
      <h1 className="max-w-md text-3xl font-display italic uppercase leading-tight">
        Página en construcción
      </h1>
      <p className="max-w-sm text-muted">
        Pronto tendrás más información de {nombre}.
      </p>
    </div>
  );
}

function NavLinks({ data }: { data: LandingPublicaDTO }) {
  return (
    <nav className="hidden items-center gap-5 text-xs font-semibold text-muted sm:flex">
      <a href="#inicio" className="hover:text-foreground">
        Inicio
      </a>
      <a href="#nosotros" className="hover:text-foreground">
        Nosotros
      </a>
      {data.categorias.length > 0 && (
        <a href="#programas" className="hover:text-foreground">
          Programas
        </a>
      )}
      {data.sedes.length > 0 && (
        <a href="#instalaciones" className="hover:text-foreground">
          Instalaciones
        </a>
      )}
      <a href="#contacto" className="hover:text-foreground">
        Contacto
      </a>
    </nav>
  );
}

function BotonWhatsapp({ whatsappUrl, className }: { whatsappUrl: string; className?: string }) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-1.5 text-xs font-bold text-brand ring-1 ring-brand/40 transition-colors hover:bg-brand/25 ${className ?? ""}`}
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      Contáctanos por WhatsApp
    </a>
  );
}

function Header({ data, slug }: { data: LandingPublicaDTO; slug: string }) {
  return (
    <header
      id="inicio"
      className="sticky top-0 z-40 border-b border-subtle bg-base/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-2">
          {data.tieneEscudo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/archivos/escudo-publico/${slug}`}
              alt=""
              className="h-8 w-8 rounded object-contain"
            />
          )}
          <span className="text-sm font-black italic uppercase tracking-tight">
            {data.nombre}
          </span>
        </div>
        <NavLinks data={data} />
        {data.whatsappUrl && <BotonWhatsapp whatsappUrl={data.whatsappUrl} />}
      </div>
    </header>
  );
}

function HeroSeccion({ data }: { data: LandingPublicaDTO }) {
  return (
    <section
      className={`relative overflow-hidden px-6 py-20 text-center sm:py-28 ${data.hero.className}`}
    >
      <HeroIlustracion
        id={data.hero.id}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {/* Viñeta: oscurece el centro para que el titular se lea sobre cualquier escena. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.38),transparent_72%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">
          {data.nombre}
        </p>
        <h1 className="mt-3 text-3xl font-display italic uppercase leading-[0.95] text-white drop-shadow-sm sm:text-5xl">
          {data.titular ?? "Formamos jugadores, formamos personas"}
        </h1>
        {data.descripcion && (
          <p className="mx-auto mt-5 max-w-xl text-white/90">{data.descripcion}</p>
        )}
        {data.whatsappUrl && (
          <a
            href={data.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-overlay shadow-lg"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Contáctanos por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}

const VALORES = [
  {
    icono: GraduationCap,
    titulo: "Formación integral",
    subtitulo: "Desarrollo deportivo y personal en cada etapa.",
  },
  {
    icono: ShieldCheck,
    titulo: "Entrenadores certificados",
    subtitulo: "Cuerpo técnico capacitado y comprometido.",
  },
  {
    icono: Sparkles,
    titulo: "Metodología moderna",
    subtitulo: "Evaluación y seguimiento con tecnología propia.",
  },
  {
    icono: Trophy,
    titulo: "Ambiente seguro",
    subtitulo: "Un espacio cuidado para crecer con confianza.",
  },
];

function ValoresStrip() {
  return (
    <section id="nosotros" className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {VALORES.map(({ icono: Icono, titulo, subtitulo }) => (
          <div
            key={titulo}
            className="rounded-2xl border border-subtle bg-surface p-6 text-center"
          >
            <Icono className="mx-auto h-6 w-6 text-brand" aria-hidden />
            <h3 className="mt-3 text-sm font-bold uppercase tracking-wide">{titulo}</h3>
            <p className="mt-1 text-xs text-muted">{subtitulo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Programas({ categorias }: { categorias: CategoriaPublicaDTO[] }) {
  return (
    <section id="programas" className="border-t border-subtle px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-display italic uppercase">
          Nuestros programas
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((c) => (
            <div
              key={c.nombre}
              className="rounded-xl border border-subtle bg-surface-2 px-5 py-4"
            >
              <p className="font-bold">{c.nombre}</p>
              {c.rangoEdad && <p className="text-xs text-muted">{c.rangoEdad}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Instalaciones({ sedes }: { sedes: SedePublicaDTO[] }) {
  return (
    <section id="instalaciones" className="border-t border-subtle px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-display italic uppercase">
          Instalaciones
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sedes.map((s) => (
            <div
              key={s.nombre}
              className="flex items-start gap-3 rounded-xl border border-subtle bg-surface-2 px-5 py-4"
            >
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-bold">{s.nombre}</p>
                {s.direccion && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    {s.direccion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contacto({ data }: { data: LandingPublicaDTO }) {
  if (!data.whatsappUrl && !data.email && !data.instagramUrl) return null;
  return (
    <section id="contacto" className="border-t border-subtle px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-display italic uppercase">Contacto</h2>
        <p className="mt-2 text-sm text-muted">
          Escríbenos, te contamos cómo sumarte a {data.nombre}.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {data.whatsappUrl && <BotonWhatsapp whatsappUrl={data.whatsappUrl} />}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {data.email}
            </a>
          )}
          {data.instagramUrl && (
            <a
              href={data.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              <AtSign className="h-3.5 w-3.5" aria-hidden />
              Instagram
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer({ nombre }: { nombre: string }) {
  return (
    <footer className="border-t border-subtle px-6 py-8 text-center text-xs text-muted">
      <p className="font-bold uppercase text-foreground">{nombre}</p>
      <p className="mt-1">Gestionado con Fútbol Career Mode.</p>
    </footer>
  );
}
