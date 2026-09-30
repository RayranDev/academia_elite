import type { ReactNode } from "react";

// Ilustraciones vectoriales del catálogo de portadas de la landing pública
// (`src/lib/landing-heroes.ts`). Decisión de producto (DECISIONES.md #89): la
// escuela NO sube fotos, así que las portadas son arte propio de la plataforma,
// sin personas ni caras. Se dibujan con `var(--brand)` (color de la escuela) y
// blanco translúcido sobre el degradado de fondo del catálogo, por eso pesan
// casi nada y se ven bien en cualquier color de marca.
//
// Son componentes puros (sin hooks): sirven en el Server Component de la landing
// y en el selector del panel de Branding.

const BLANCO = "#fff";

/** Id único por instancia de escena: el selector muestra todas a la vez. */
function ids(escena: string) {
  return { haz: `${escena}-haz`, sol: `${escena}-sol`, red: `${escena}-red` };
}

function CanchaVerde() {
  return (
    <>
      <g fill={BLANCO} fillOpacity={0.05}>
        <rect x="60" y="40" width="180" height="420" />
        <rect x="420" y="40" width="180" height="420" />
        <rect x="780" y="40" width="180" height="420" />
      </g>
      <g stroke={BLANCO} strokeOpacity={0.32} strokeWidth="3" fill="none">
        <rect x="60" y="40" width="1080" height="420" rx="6" />
        <path d="M600 40V460" />
        <circle cx="600" cy="250" r="72" />
        <rect x="60" y="130" width="170" height="240" />
        <rect x="970" y="130" width="170" height="240" />
        <rect x="60" y="192" width="70" height="116" />
        <rect x="1070" y="192" width="70" height="116" />
        <path d="M230 205a72 72 0 0 1 0 90" />
        <path d="M970 205a72 72 0 0 0 0 90" />
      </g>
      <circle cx="600" cy="250" r="6" fill={BLANCO} fillOpacity={0.45} />
    </>
  );
}

function Atardecer() {
  const { sol } = ids("atardecer");
  return (
    <>
      <defs>
        <radialGradient id={sol} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={BLANCO} stopOpacity="0.85" />
          <stop offset="35%" stopColor="var(--brand)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="600" cy="330" r="230" fill={`url(#${sol})`} />
      <rect x="0" y="330" width="1200" height="170" fill="#000" fillOpacity={0.3} />
      <g stroke={BLANCO} strokeOpacity={0.2} strokeWidth="2" fill="none">
        <path d="M600 330L60 500M600 330L330 500M600 330L870 500M600 330L1140 500" />
        <path d="M0 360H1200M0 405H1200M0 460H1200" />
      </g>
      <g stroke={BLANCO} strokeOpacity={0.45} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M880 330V296H960V330" />
        <path d="M896 330V296M912 330V296M928 330V296M944 330V296" strokeOpacity={0.2} strokeWidth="1.5" />
      </g>
    </>
  );
}

function EstadioNoche() {
  const { haz } = ids("estadio-noche");
  const torres = [
    { x: 150, y: 90, w: 60 },
    { x: 420, y: 130, w: 44 },
    { x: 780, y: 130, w: 44 },
    { x: 1050, y: 90, w: 60 },
  ];
  return (
    <>
      <defs>
        <linearGradient id={haz} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLANCO} stopOpacity="0.3" />
          <stop offset="100%" stopColor={BLANCO} stopOpacity="0" />
        </linearGradient>
      </defs>
      {torres.map((t) => (
        <g key={t.x}>
          <polygon
            points={`${t.x - t.w / 2},${t.y} ${t.x + t.w / 2},${t.y} ${t.x + t.w * 3.2},500 ${t.x - t.w * 3.2},500`}
            fill={`url(#${haz})`}
          />
          <path d={`M${t.x} ${t.y + 10}V500`} stroke={BLANCO} strokeOpacity={0.18} strokeWidth="4" />
          <rect x={t.x - t.w / 2} y={t.y - 16} width={t.w} height="22" rx="4" fill={BLANCO} fillOpacity={0.85} />
        </g>
      ))}
      <g fill="var(--brand)">
        <circle cx="300" cy="380" r="26" fillOpacity={0.12} />
        <circle cx="560" cy="430" r="14" fillOpacity={0.16} />
        <circle cx="690" cy="340" r="34" fillOpacity={0.1} />
        <circle cx="930" cy="410" r="20" fillOpacity={0.14} />
        <circle cx="90" cy="440" r="18" fillOpacity={0.12} />
      </g>
    </>
  );
}

function LineasCancha() {
  return (
    <>
      <g stroke={BLANCO} strokeOpacity={0.4} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M-20 110H430V390H-20" />
        <path d="M-20 190H160V310H-20" />
        <path d="M430 160a130 130 0 0 1 0 180" />
        <path d="M1200 390a110 110 0 0 0-110 110" />
        <path d="M760 -20V520" strokeOpacity={0.18} strokeWidth="4" />
      </g>
      <circle cx="300" cy="250" r="9" fill="var(--brand)" fillOpacity={0.8} />
      <circle cx="300" cy="250" r="26" fill="none" stroke="var(--brand)" strokeOpacity={0.35} strokeWidth="3" />
    </>
  );
}

function Vestuario() {
  const camisetas = [
    { x: 100, n: "7", marca: true },
    { x: 240, n: "10", marca: false },
    { x: 960, n: "9", marca: false },
    { x: 1100, n: "11", marca: true },
  ];
  return (
    <>
      {/* El centro queda libre: ahí va el titular de la landing. */}
      <path d="M50 110H370M830 110H1150" stroke={BLANCO} strokeOpacity={0.3} strokeWidth="6" strokeLinecap="round" />
      {camisetas.map((c) => (
        <g key={c.x} transform={`translate(${c.x} 122)`}>
          <circle cx="0" cy="-12" r="6" fill={BLANCO} fillOpacity={0.5} />
          <path
            d="M-28 0 -60 24 -46 52 -30 44V134H30V44L46 52 60 24 28 0Q0 20 -28 0Z"
            fill={c.marca ? "var(--brand)" : BLANCO}
            fillOpacity={c.marca ? 0.4 : 0.2}
            stroke={BLANCO}
            strokeOpacity={0.35}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <text
            y="98"
            textAnchor="middle"
            fontSize="44"
            fontWeight="900"
            fontStyle="italic"
            fill={BLANCO}
            fillOpacity={0.55}
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
          >
            {c.n}
          </text>
        </g>
      ))}
      <rect x="50" y="396" width="320" height="26" rx="8" fill={BLANCO} fillOpacity={0.2} />
      <rect x="830" y="396" width="320" height="26" rx="8" fill={BLANCO} fillOpacity={0.2} />
      <path d="M90 422V470M330 422V470M870 422V470M1110 422V470" stroke={BLANCO} strokeOpacity={0.25} strokeWidth="10" strokeLinecap="round" />
    </>
  );
}

function Porteria() {
  const { red } = ids("porteria");
  return (
    <>
      <defs>
        <pattern id={red} width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke={BLANCO} strokeOpacity="0.22" strokeWidth="1.5" />
        </pattern>
      </defs>
      {/* Arco a la derecha y balón a la izquierda: el centro queda libre para el titular. */}
      <rect x="880" y="180" width="270" height="240" fill={`url(#${red})`} />
      <path
        d="M880 420V180H1150V420"
        fill="none"
        stroke={BLANCO}
        strokeOpacity={0.6}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M0 420H1200" stroke={BLANCO} strokeOpacity={0.22} strokeWidth="3" />
      <g transform="translate(200 386)">
        <circle r="34" fill={BLANCO} fillOpacity={0.22} stroke={BLANCO} strokeOpacity={0.5} strokeWidth="3" />
        <path d="M0-14 13-4 8 11H-8L-13-4Z" fill={BLANCO} fillOpacity={0.5} />
      </g>
      <g fill="var(--brand)" fillOpacity={0.7}>
        <polygon points="62,420 82,376 102,420" />
        <polygon points="110,420 130,388 150,420" fillOpacity={0.45} />
      </g>
    </>
  );
}

function Balon() {
  return (
    <>
      <circle cx="930" cy="250" r="210" fill={BLANCO} fillOpacity={0.1} stroke={BLANCO} strokeOpacity={0.4} strokeWidth="5" />
      <polygon points="930,188 989,231 966,300 894,300 871,231" fill={BLANCO} fillOpacity={0.3} stroke={BLANCO} strokeOpacity={0.5} strokeWidth="4" strokeLinejoin="round" />
      <g stroke={BLANCO} strokeOpacity={0.4} strokeWidth="4" strokeLinecap="round">
        <path d="M930 188V40M989 231 1130 185M966 300 1053 420M894 300 807 420M871 231 730 185" />
      </g>
      <g fill="none" stroke="var(--brand)" strokeLinecap="round">
        <path d="M60 390C250 350 420 320 690 280" strokeOpacity={0.55} strokeWidth="6" />
        <path d="M120 440C300 400 450 380 690 340" strokeOpacity={0.35} strokeWidth="4" />
        <path d="M30 330C200 300 330 280 560 240" strokeOpacity={0.25} strokeWidth="3" />
      </g>
    </>
  );
}

const ESCENAS: Record<string, () => ReactNode> = {
  "cancha-verde": CanchaVerde,
  atardecer: Atardecer,
  "estadio-noche": EstadioNoche,
  "lineas-cancha": LineasCancha,
  vestuario: Vestuario,
  porteria: Porteria,
  balon: Balon,
};

/**
 * Ilustración de una portada del catálogo. Un id desconocido cae a la primera
 * escena, igual que `heroLandingPorId`. Ocupa todo el contenedor posicionado.
 */
export function HeroIlustracion({ id, className }: { id: string; className?: string }) {
  const Escena = ESCENAS[id] ?? CanchaVerde;
  return (
    <svg
      viewBox="0 0 1200 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Escena />
    </svg>
  );
}
