import type { EfectoCarta, EfectoParams } from "@/types";

// Catálogo de fondos curados (módulo puro de datos — sin Prisma ni React).
// Se reutiliza en dos lugares:
//  1. `prisma/seed.ts` los siembra junto al catálogo base.
//  2. El creador (Súper Admin) los ofrece como "plantillas" clickeables: elegir
//     una rellena `estilo` + `colorTexto` + `efecto` + `efectoParams` sin tipear
//     CSS a mano.
//
// El `estilo` de cada preset ya se ve profesional por sí solo (degradado base).
// Los presets con `efecto !== "NINGUNO"` se potencian cuando el motor de efectos
// (PR2) apila sus capas encima del estilo base.

export type RequisitoFondoPreset = "SIEMPRE" | "LOGRO" | "NIVEL_CARTA" | "NIVEL_PERSONAL";

export interface FondoPreset {
  codigo: string;
  nombre: string;
  descripcion: string;
  estilo: string;
  colorTexto: string;
  efecto: EfectoCarta;
  efectoParams: EfectoParams | null;
  requisitoTipo: RequisitoFondoPreset;
  requisitoValor: string | null;
  orden: number;
}

export const FONDOS_PRESETS: readonly FondoPreset[] = [
  // --- Simples (solo color/degradado, sin efecto) ---
  {
    codigo: "NOCTURNO",
    nombre: "Nocturno",
    descripcion: "Azul profundo de medianoche.",
    estilo: "radial-gradient(120% 120% at 50% 0%, #1e293b 0%, #0b1220 55%, #060912 100%)",
    colorTexto: "#e5e7eb",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 10,
  },
  {
    codigo: "PIZARRA",
    nombre: "Pizarra",
    descripcion: "Gris azulado sobrio.",
    estilo: "linear-gradient(160deg,#334155 0%,#1e293b 55%,#0f172a 100%)",
    colorTexto: "#e5e7eb",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 11,
  },
  {
    codigo: "GRAFITO",
    nombre: "Grafito",
    descripcion: "Gris neutro elegante.",
    estilo: "linear-gradient(160deg,#3f3f46 0%,#27272a 55%,#18181b 100%)",
    colorTexto: "#e4e4e7",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 12,
  },
  {
    codigo: "MARINO",
    nombre: "Marino",
    descripcion: "Verdeazulado del océano.",
    estilo: "linear-gradient(160deg,#0e4f63 0%,#0b3a4a 50%,#06222c 100%)",
    colorTexto: "#d8f3fb",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 13,
  },
  {
    codigo: "VINO",
    nombre: "Vino",
    descripcion: "Borgoña intenso.",
    estilo: "linear-gradient(160deg,#4c0f23 0%,#7a1733 50%,#2a0814 100%)",
    colorTexto: "#ffe4ec",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 14,
  },
  {
    codigo: "BOSQUE",
    nombre: "Bosque",
    descripcion: "Verde profundo de selva.",
    estilo: "linear-gradient(160deg,#14532d 0%,#166534 45%,#052e16 100%)",
    colorTexto: "#dcfce7",
    efecto: "NINGUNO",
    efectoParams: null,
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 15,
  },

  // --- Metálicos (base + efecto METALICO con tinte) ---
  {
    codigo: "ACERO",
    nombre: "Acero",
    descripcion: "Brillo de acero pulido.",
    estilo: "linear-gradient(160deg,#cbd5e1 0%,#94a3b8 35%,#e2e8f0 60%,#64748b 100%)",
    colorTexto: "#1b2433",
    efecto: "METALICO",
    efectoParams: { tinte: "acero", intensidad: 0.55 },
    requisitoTipo: "NIVEL_PERSONAL",
    requisitoValor: "3",
    orden: 16,
  },
  {
    codigo: "TITANIO",
    nombre: "Titanio",
    descripcion: "Metal frío y técnico.",
    estilo: "linear-gradient(160deg,#9ca3af 0%,#e5e7eb 30%,#6b7280 65%,#d1d5db 100%)",
    colorTexto: "#1f2430",
    efecto: "METALICO",
    efectoParams: { tinte: "titanio", intensidad: 0.55 },
    requisitoTipo: "NIVEL_PERSONAL",
    requisitoValor: "5",
    orden: 17,
  },
  {
    codigo: "ORO_ROSA",
    nombre: "Oro rosa",
    descripcion: "Reflejo cálido de oro rosado.",
    estilo: "linear-gradient(160deg,#b76e79 0%,#e8b4bc 30%,#a85d68 60%,#f0c9cf 100%)",
    colorTexto: "#3a1f23",
    efecto: "METALICO",
    efectoParams: { tinte: "oro", intensidad: 0.5 },
    requisitoTipo: "NIVEL_CARTA",
    requisitoValor: "ORO",
    orden: 18,
  },
  {
    codigo: "COBRE_MET",
    nombre: "Cobre metálico",
    descripcion: "Cobre con barrido especular.",
    estilo: "linear-gradient(160deg,#7a4a27 0%,#d99a63 30%,#8a5a34 60%,#b87a47 100%)",
    colorTexto: "#fdeede",
    efecto: "METALICO",
    efectoParams: { tinte: "cobre", intensidad: 0.6 },
    requisitoTipo: "NIVEL_PERSONAL",
    requisitoValor: "2",
    orden: 19,
  },

  // --- Hielo (base fría + efecto HIELO) ---
  {
    codigo: "GLACIAR",
    nombre: "Glaciar",
    descripcion: "Hielo escarchado luminoso.",
    estilo: "linear-gradient(160deg,#bae6fd 0%,#e0f2fe 35%,#7dd3fc 70%,#cffafe 100%)",
    colorTexto: "#0c2433",
    efecto: "HIELO",
    efectoParams: { intensidad: 0.6 },
    requisitoTipo: "NIVEL_PERSONAL",
    requisitoValor: "4",
    orden: 20,
  },
  {
    codigo: "ARTICO",
    nombre: "Ártico",
    descripcion: "Cristal de hielo pálido.",
    estilo: "linear-gradient(160deg,#e0f2fe 0%,#bfdbfe 40%,#93c5fd 75%,#dbeafe 100%)",
    colorTexto: "#13233a",
    efecto: "HIELO",
    efectoParams: { intensidad: 0.5 },
    requisitoTipo: "NIVEL_CARTA",
    requisitoValor: "PLATA",
    orden: 21,
  },

  // --- Trama (base + efecto TRAMA con patrón) ---
  {
    codigo: "CARBONO",
    nombre: "Carbono",
    descripcion: "Fibra de carbono técnica.",
    estilo: "linear-gradient(160deg,#1f2937 0%,#111827 100%)",
    colorTexto: "#e5e7eb",
    efecto: "TRAMA",
    efectoParams: { tramaPatron: "carbono", intensidad: 0.5 },
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 22,
  },
  {
    codigo: "ESPIGA",
    nombre: "Espiga",
    descripcion: "Trama de espiga sutil.",
    estilo: "linear-gradient(160deg,#27303f 0%,#16202b 100%)",
    colorTexto: "#e5e7eb",
    efecto: "TRAMA",
    efectoParams: { tramaPatron: "espiga", intensidad: 0.45 },
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 23,
  },
  {
    codigo: "PUNTOS",
    nombre: "Puntos",
    descripcion: "Retícula de puntos finos.",
    estilo: "linear-gradient(160deg,#1e1b3a 0%,#11102a 100%)",
    colorTexto: "#ede9fe",
    efecto: "TRAMA",
    efectoParams: { tramaPatron: "puntos", intensidad: 0.4 },
    requisitoTipo: "SIEMPRE",
    requisitoValor: null,
    orden: 24,
  },
  {
    codigo: "ROMBOS",
    nombre: "Rombos",
    descripcion: "Trama de rombos diagonal.",
    estilo: "linear-gradient(160deg,#312e2b 0%,#1c1a18 100%)",
    colorTexto: "#f1ede4",
    efecto: "TRAMA",
    efectoParams: { tramaPatron: "rombos", intensidad: 0.4 },
    requisitoTipo: "NIVEL_PERSONAL",
    requisitoValor: "2",
    orden: 25,
  },
] as const;
