"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { ORDEN_NIVEL } from "@/lib/fondos";
import {
  crearFondoAction,
  editarFondoAction,
  eliminarFondoAction,
} from "@/actions/fondo.actions";
import type { FondoAdminDTO } from "@/services/fondo.service";
import type { ActionResult } from "@/lib/action-result";
import type { PlayerCardData } from "@/types";

const input =
  "w-full rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

type LogroOpcion = { codigo: string; nombre: string };

/** Carta de muestra para previsualizar el estilo del fondo en vivo. */
function cartaPreview(estilo: string, colorTexto: string | null): PlayerCardData {
  return {
    nombre: "Vista",
    apellido: "Previa",
    posicion: "DEL",
    ovr: 84,
    nivel: "ORO",
    stats: { rit: 85, tir: 82, pas: 80, reg: 86, def: 60, fis: 78 },
    men: 83,
    fotoUrl: null,
    dorsal: 10,
    avatarConfig: null,
    fondoEstilo: estilo || null,
    fondoTexto: colorTexto || null,
    heroeEquipado: false,
  };
}

export function FondosAdmin({
  fondos,
  logros,
}: {
  fondos: FondoAdminDTO[];
  logros: LogroOpcion[];
}) {
  const [editando, setEditando] = useState<FondoAdminDTO | null>(null);
  const [creando, setCreando] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreando(true)}>Nuevo fondo</Button>
      </div>

      {fondos.length === 0 ? (
        <Card>
          <p className="text-muted">Aún no hay fondos. Crea el primero.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fondos.map((f) => (
            <Card key={f.id} className="space-y-3">
              <div
                className="h-20 w-full rounded-lg border border-subtle"
                style={{ background: f.estilo }}
                aria-hidden
              />
              <div>
                <p className="font-bold">{f.nombre}</p>
                <p className="font-mono text-[10px] text-muted">{f.codigo}</p>
                <p className="mt-1 text-xs text-muted">{f.descripcion}</p>
                <p className="mt-1 text-xs">
                  <span className="font-semibold text-brand">{f.requisitoTipo}</span>
                  {f.requisitoValor ? ` · ${f.requisitoValor}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditando(f)}>
                  Editar
                </Button>
                <EliminarFondo fondo={f} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {creando && (
        <FondoFormModal
          titulo="Nuevo fondo"
          logros={logros}
          action={crearFondoAction}
          onClose={() => setCreando(false)}
        />
      )}
      {editando && (
        <FondoFormModal
          titulo={`Editar: ${editando.nombre}`}
          logros={logros}
          fondo={editando}
          action={editarFondoAction}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function EliminarFondo({ fondo }: { fondo: FondoAdminDTO }) {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (_prev, fd) => eliminarFondoAction(_prev, fd),
    undefined,
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar el fondo "${fondo.nombre}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="fondoId" value={fondo.id} />
      <Button size="sm" variant="ghost" type="submit" disabled={pending}>
        {pending ? "…" : "Eliminar"}
      </Button>
      {state && !state.ok && (
        <p className="mt-1 text-xs text-alerta" role="alert">{state.error}</p>
      )}
    </form>
  );
}

function FondoFormModal({
  titulo,
  logros,
  fondo,
  action,
  onClose,
}: {
  titulo: string;
  logros: LogroOpcion[];
  fondo?: FondoAdminDTO;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [estilo, setEstilo] = useState(fondo?.estilo ?? "");
  const [colorTexto, setColorTexto] = useState(fondo?.colorTexto ?? "");
  const [requisitoTipo, setRequisitoTipo] = useState(fondo?.requisitoTipo ?? "SIEMPRE");
  const [requisitoValor, setRequisitoValor] = useState(fondo?.requisitoValor ?? "");

  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    async (prev, fd) => {
      const res = await action(prev, fd);
      if (res.ok) onClose();
      return res;
    },
    undefined,
  );

  return (
    <Modal open onClose={onClose} title={titulo}>
      <form action={formAction} className="space-y-3">
        {fondo && <input type="hidden" name="fondoId" value={fondo.id} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Código (único)</label>
            <input
              name="codigo"
              required={!fondo}
              defaultValue={fondo?.codigo}
              disabled={!!fondo}
              placeholder="LEYENDA"
              className={`${input} disabled:opacity-60`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Orden</label>
            <input
              name="orden"
              type="number"
              min={0}
              defaultValue={fondo?.orden ?? 0}
              className={input}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Nombre</label>
          <input name="nombre" required defaultValue={fondo?.nombre} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Descripción</label>
          <textarea name="descripcion" rows={2} required defaultValue={fondo?.descripcion} className={input} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">
            Estilo CSS (valor de <code>background</code>)
          </label>
          <textarea
            name="estilo"
            rows={2}
            required
            value={estilo}
            onChange={(e) => setEstilo(e.target.value)}
            placeholder="linear-gradient(135deg, #6d28d9, #db2777)"
            className={`${input} font-mono text-xs`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">
            Color de texto (opcional, p. ej. <code>#fff</code>)
          </label>
          <input
            name="colorTexto"
            value={colorTexto}
            onChange={(e) => setColorTexto(e.target.value)}
            placeholder="#ffffff"
            className={input}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Requisito</label>
            <select
              name="requisitoTipo"
              value={requisitoTipo}
              onChange={(e) => {
                setRequisitoTipo(e.target.value);
                setRequisitoValor("");
              }}
              className={input}
            >
              <option value="SIEMPRE">Siempre (todos)</option>
              <option value="LOGRO">Logro especial</option>
              <option value="NIVEL_CARTA">Nivel de carta</option>
              <option value="NIVEL_PERSONAL">Nivel personal</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Valor del requisito</label>
            {requisitoTipo === "SIEMPRE" && (
              <input value="—" disabled className={`${input} disabled:opacity-60`} />
            )}
            {requisitoTipo === "LOGRO" && (
              <select
                name="requisitoValor"
                value={requisitoValor}
                onChange={(e) => setRequisitoValor(e.target.value)}
                className={input}
              >
                <option value="">Elige un logro…</option>
                {logros.map((l) => (
                  <option key={l.codigo} value={l.codigo}>{l.nombre}</option>
                ))}
              </select>
            )}
            {requisitoTipo === "NIVEL_CARTA" && (
              <select
                name="requisitoValor"
                value={requisitoValor}
                onChange={(e) => setRequisitoValor(e.target.value)}
                className={input}
              >
                <option value="">Elige un nivel…</option>
                {ORDEN_NIVEL.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}
            {requisitoTipo === "NIVEL_PERSONAL" && (
              <input
                name="requisitoValor"
                type="number"
                min={1}
                value={requisitoValor}
                onChange={(e) => setRequisitoValor(e.target.value)}
                className={input}
              />
            )}
          </div>
        </div>

        {/* Vista previa en vivo del estilo aplicado a la carta */}
        <div className="flex justify-center rounded-lg border border-subtle bg-surface-2 py-4">
          <div className="perspective-[1000px]">
            <PlayerCard data={cartaPreview(estilo, colorTexto || null)} size="md" />
          </div>
        </div>

        {state && !state.ok && (
          <p className="text-sm text-alerta" role="alert">{state.error}</p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : fondo ? "Guardar cambios" : "Crear fondo"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
