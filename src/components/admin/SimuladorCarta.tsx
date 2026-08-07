"use client";

import { useMemo, useRef, useState } from "react";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FotoCropper } from "@/components/jugador/FotoCropper";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { prepararParaRecorte } from "@/lib/foto/cliente";
import { avatarDesdeSeed } from "@/lib/avatar/config";
import type { AvatarConfigV2 } from "@/lib/avatar/toon-head";
import type { FondoCatalogoDTO } from "@/services/fondo.service";
import {
  computeStats,
  RANGOS_POR_GRUPO,
  type GrupoEdad,
  type MedidasEvaluacion,
  type RangosFisicos,
  type UmbralesNivel,
} from "@/lib/stats-engine";
import { CLAVES_TECNICAS, medidasTecnicas } from "@/lib/medidas-tecnicas";
import { POSICIONES, type Posicion, type PlayerCardData } from "@/types";

const GRUPOS: GrupoEdad[] = ["SUB8", "SUB10", "SUB12", "SUB14", "SUB16"];

/**
 * De dónde salen los rangos físicos que usa el simulador (Fase B): modo
 * global sigue siendo por `GrupoEdad` (franja etaria fija, sin escuela
 * elegida); modo escuela pasa a ser por CATEGORÍA real (reemplaza el antiguo
 * "por GrupoEdad" de una escuela puntual).
 */
export type FuenteRangos =
  | { modo: "GLOBAL"; rangosPorGrupo: Record<GrupoEdad, RangosFisicos> }
  | { modo: "CATEGORIA"; categorias: { id: string; nombre: string; rangos: RangosFisicos }[] };

interface CampoMedida {
  key: keyof MedidasEvaluacion;
  label: string;
  min: number;
  max: number;
  step: number;
}

const FISICAS: CampoMedida[] = [
  { key: "sprint30mSeg", label: "Sprint 30 m (s) — menos es mejor", min: 3.5, max: 8.5, step: 0.1 },
  { key: "saltoVerticalCm", label: "Salto vertical (cm)", min: 8, max: 65, step: 1 },
  { key: "agilidadIllinoisSeg", label: "Agilidad Illinois (s) — menos es mejor", min: 13, max: 25, step: 0.1 },
  { key: "resistenciaYoyoNivel", label: "Resistencia Yo-Yo (nivel)", min: 1, max: 22, step: 0.5 },
];
const MENTALIDAD: CampoMedida[] = [
  { key: "actitud", label: "Actitud (1-10)", min: 1, max: 10, step: 0.5 },
  { key: "concentracion", label: "Concentración (1-10)", min: 1, max: 10, step: 0.5 },
  { key: "trabajoEquipo", label: "Trabajo en equipo (1-10)", min: 1, max: 10, step: 0.5 },
  { key: "resiliencia", label: "Resiliencia (1-10)", min: 1, max: 10, step: 0.5 },
];

/**
 * Las cuatro notas técnicas según la posición elegida. El simulador ofrece POR,
 * y para un arquero el motor usa `derivaStatsPortero`: si los sliders siguieran
 * diciendo "Regate", el SA estaría moviendo el achique sin saberlo.
 */
function notasDe(posicion: Posicion): CampoMedida[] {
  const tecnicas = medidasTecnicas(posicion);
  return [
    ...CLAVES_TECNICAS.map((key) => ({
      key,
      label: `${tecnicas[key].etiqueta} (1-10)`,
      min: 1,
      max: 10,
      step: 0.5,
    })),
    ...MENTALIDAD,
  ];
}

const INICIAL: MedidasEvaluacion = {
  sprint30mSeg: 5.5,
  saltoVerticalCm: 30,
  agilidadIllinoisSeg: 18,
  resistenciaYoyoNivel: 10,
  controlBalon: 6,
  pase: 6,
  tiro: 6,
  regate: 6,
  actitud: 7,
  concentracion: 6,
  trabajoEquipo: 7,
  resiliencia: 6,
};

/**
 * Simulador de carta (G7): reproduce EXACTAMENTE el motor de evaluaciones
 * (mismo `computeStats`, mismos rangos de BD) para saber qué hay que medir
 * para alcanzar cada rango de carta.
 */
export function SimuladorCarta({
  fuenteRangos,
  pesoMen,
  umbrales,
  fondos,
}: {
  fuenteRangos: FuenteRangos;
  pesoMen: number;
  umbrales: UmbralesNivel;
  fondos: FondoCatalogoDTO[];
}) {
  const [medidas, setMedidas] = useState<MedidasEvaluacion>(INICIAL);
  const [posicion, setPosicion] = useState<Posicion>("DEL");
  // Selección unificada: `GrupoEdad` en modo global, `categoriaId` en modo
  // escuela. Un solo <select> controlado por vez, según `fuenteRangos.modo`.
  const [seleccion, setSeleccion] = useState<string>(() =>
    fuenteRangos.modo === "GLOBAL" ? "SUB12" : (fuenteRangos.categorias[0]?.id ?? ""),
  );
  const rangosActivos: RangosFisicos | undefined =
    fuenteRangos.modo === "GLOBAL"
      ? fuenteRangos.rangosPorGrupo[seleccion as GrupoEdad]
      : fuenteRangos.categorias.find((c) => c.id === seleccion)?.rangos;
  // Apariencia (solo previsualización, no se guarda nada).
  const [nombre, setNombre] = useState("Jugador");
  const [apellido, setApellido] = useState("Simulado");
  const [dorsal, setDorsal] = useState(10);
  const [fondoCodigo, setFondoCodigo] = useState("");
  const SEED_AVATAR = "simulador";
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfigV2 | null>(
    avatarDesdeSeed(SEED_AVATAR),
  );
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [imagenCrop, setImagenCrop] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  function setAvatarCampo<K extends keyof AvatarConfigV2>(k: K, v: AvatarConfigV2[K]) {
    setAvatarConfig((c) => ({ ...(c ?? avatarDesdeSeed(SEED_AVATAR)), [k]: v }));
  }

  const fondoSel = fondos.find((f) => f.codigo === fondoCodigo) ?? null;

  async function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setImagenCrop(await prepararParaRecorte(file));
    if (inputFoto.current) inputFoto.current.value = "";
  }

  // Si la escuela no tiene (todavía) ninguna categoría con rango físico
  // configurado, se cae al rango embebido SUB16 (mismo criterio de respaldo
  // que `grupoEdadSemilla`) para que el simulador no rompa; el aviso de abajo
  // lo deja explícito.
  const rangos = rangosActivos ?? RANGOS_POR_GRUPO.SUB16;

  const resultado = useMemo(
    () =>
      computeStats(medidas, {
        posicion,
        rangos,
        pesoMenEnOvr: pesoMen,
        umbrales,
      }),
    [medidas, posicion, rangos, pesoMen, umbrales],
  );

  const card: PlayerCardData = {
    nombre: nombre || "Jugador",
    apellido: apellido || "Simulado",
    posicion,
    ovr: resultado.ovr,
    nivel: resultado.nivel,
    stats: {
      rit: resultado.rit,
      tir: resultado.tir,
      pas: resultado.pas,
      reg: resultado.reg,
      def: resultado.def,
      fis: resultado.fis,
    },
    men: resultado.men,
    fotoUrl,
    dorsal,
    avatarConfig,
    fondoEstilo: fondoSel?.estilo ?? null,
    fondoTexto: fondoSel?.colorTexto ?? null,
    fondoEfecto: fondoSel?.efecto ?? null,
    fondoEfectoParams: fondoSel?.efectoParams ?? null,
    // En el simulador (a diferencia de un jugador real) el marco Héroe se ve
    // automático al llegar al umbral: el objetivo es previsualizar CADA
    // nivel, y exigir además elegir el fondo "Leyenda" lo dejaba cojo justo
    // en el nivel más alto. No afecta cómo se ve la carta de un jugador real.
    heroeEquipado: fondoSel?.codigo === "LEYENDA" || resultado.nivel === "HEROE",
  };

  function set(key: keyof MedidasEvaluacion, v: number) {
    setMedidas((m) => ({ ...m, [key]: v }));
  }

  const campo = (c: CampoMedida) => (
    <label key={c.key} className="block text-sm">
      <span className="mb-0.5 flex items-center justify-between text-xs text-muted">
        {c.label}
        <span className="tabular font-bold text-foreground">{medidas[c.key]}</span>
      </span>
      <input
        type="range"
        min={c.min}
        max={c.max}
        step={c.step}
        value={medidas[c.key]}
        onChange={(e) => set(c.key, Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
      />
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Posición</span>
              <select
                value={posicion}
                onChange={(e) => setPosicion(e.target.value as Posicion)}
                className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {POSICIONES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">
                {fuenteRangos.modo === "GLOBAL" ? "Grupo de edad" : "Categoría"}
              </span>
              <select
                value={seleccion}
                onChange={(e) => setSeleccion(e.target.value)}
                className="rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {fuenteRangos.modo === "GLOBAL"
                  ? GRUPOS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))
                  : fuenteRangos.categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
              </select>
            </label>
          </div>
          {fuenteRangos.modo === "CATEGORIA" && !rangosActivos && (
            <p className="mt-2 text-xs text-alerta">
              Esta escuela no tiene categorías con rangos físicos configurados
              (o ninguna elegida): se está usando el rango SUB16 por defecto.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Pruebas físicas (medidas reales)</h2>
          <div className="grid gap-3 sm:grid-cols-2">{FISICAS.map(campo)}</div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Técnica y mentalidad (notas 1-10)</h2>
          <div className="grid gap-3 sm:grid-cols-2">{notasDe(posicion).map(campo)}</div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Apariencia (prueba)</h2>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted">Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted">Apellido</span>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted">Dorsal</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  value={dorsal}
                  onChange={(e) => {
                    // Clamp en el propio cambio: los atributos min/max del
                    // input son solo una sugerencia visual, no lo impiden.
                    const n = Math.round(Number(e.target.value));
                    if (Number.isNaN(n)) return;
                    setDorsal(Math.min(100, Math.max(1, n)));
                  }}
                  className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm tabular outline-none focus:border-brand"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted">Fondo</span>
              <select
                value={fondoCodigo}
                onChange={(e) => setFondoCodigo(e.target.value)}
                className="w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">Sin fondo (material por nivel)</option>
                {fondos.map((f) => (
                  <option key={f.codigo} value={f.codigo}>{f.nombre}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1 block text-xs text-muted">Retrato</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => { setAvatarConfig(avatarDesdeSeed(String(Math.random()))); setFotoUrl(null); }}>
                  Avatar aleatorio
                </Button>
                <input ref={inputFoto} type="file" accept="image/*" onChange={alElegirFoto} className="hidden" />
                <Button type="button" size="sm" variant="secondary" onClick={() => inputFoto.current?.click()}>
                  Probar foto…
                </Button>
                {fotoUrl && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFotoUrl(null)}>
                    Quitar foto
                  </Button>
                )}
              </div>
            </div>

            {avatarConfig && (
              <div className="border-t border-subtle pt-3">
                <span className="mb-2 block text-xs text-muted">
                  Personalizar avatar (se usa cuando no hay foto)
                </span>
                <AvatarPicker cfg={avatarConfig} seed={SEED_AVATAR} onChange={setAvatarCampo} />
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="perspective-[1000px]">
          <PlayerCard data={card} size="hero" interactive />
        </div>
        <Card className="w-full max-w-xs text-sm">
          <h3 className="mb-2 font-bold">Umbrales de nivel</h3>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between"><span className="font-semibold text-bronce">Bronce</span><span className="tabular text-muted">OVR &lt; {umbrales.plata}</span></li>
            <li className="flex justify-between"><span className="font-semibold text-plata">Plata</span><span className="tabular text-muted">{umbrales.plata} – {umbrales.oro - 1}</span></li>
            <li className="flex justify-between"><span className="font-semibold text-oro">Oro</span><span className="tabular text-muted">{umbrales.oro} – {umbrales.heroe - 1}</span></li>
            <li className="flex justify-between"><span className="font-semibold text-heroe">Héroe</span><span className="tabular text-muted">≥ {umbrales.heroe}</span></li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            Peso de MEN en el OVR: {Math.round(pesoMen * 100)}%. Usa los mismos
            rangos por edad configurados en Parámetros.
          </p>
        </Card>
      </div>

      {imagenCrop && (
        <FotoCropper
          imagen={imagenCrop}
          procesando={false}
          onConfirmar={(blob) => {
            setFotoUrl(URL.createObjectURL(blob));
            setImagenCrop(null);
          }}
          onCancelar={() => setImagenCrop(null)}
        />
      )}
    </div>
  );
}
