import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Brain, CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";
import { requireAuthContext } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import {
  obtenerProgresoPersonal,
  type ProgresoPersonalDTO,
} from "@/services/progreso.service";
import { HABITOS, ETIQUETA_HABITO } from "@/lib/progreso/engine";
import { ProgresoPanel } from "@/components/jugador/ProgresoPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

async function cargar(): Promise<ProgresoPersonalDTO | null> {
  const ctx = await requireAuthContext();
  try {
    return await obtenerProgresoPersonal(ctx);
  } catch (e) {
    if (e instanceof DomainError) return null;
    throw e;
  }
}

function Atributo({
  icono,
  nombre,
  valor,
}: {
  icono: React.ReactNode;
  nombre: string;
  valor: number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
          {icono}
          {nombre}
        </div>
        <span className="font-display text-3xl italic tabular">{valor}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${valor}%` }}
        />
      </div>
    </Card>
  );
}

export default async function ProgresoPage() {
  const progreso = await cargar();
  if (!progreso) {
    return (
      <Card>
        <p className="text-muted">Aún no hay un jugador vinculado a tu cuenta.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display italic uppercase">Progreso personal</h1>
      <p className="text-sm text-muted">
        {progreso.nombre} {progreso.apellido} · crecimiento fuera de la cancha,
        validado por la familia. No afecta la carta deportiva.
      </p>

      {/* Nivel y XP */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted">
            <Sparkles className="h-4 w-4 text-brand" aria-hidden />
            Nivel personal
          </div>
          <span className="font-display text-3xl italic tabular">
            {progreso.nivel}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full bg-brand"
            style={{
              width: `${Math.round((progreso.xpEnNivel / progreso.xpParaSubir) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          {progreso.xpEnNivel}/{progreso.xpParaSubir} XP para el siguiente nivel
          · {progreso.xp} XP en total
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Atributo
          icono={<Brain className="h-4 w-4 text-brand" aria-hidden />}
          nombre="Mentalidad"
          valor={progreso.mentalidad}
        />
        <Atributo
          icono={<ShieldCheck className="h-4 w-4 text-brand" aria-hidden />}
          nombre="Disciplina"
          valor={progreso.disciplina}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProgresoPanel
          jugadorId={progreso.jugadorId}
          semanaValidada={progreso.semanaValidada}
        />

        <Card>
          <h2 className="mb-3 text-lg font-bold">Historial</h2>
          {progreso.historial.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              titulo="Sin semanas validadas"
              texto="Cuando valides la primera semana aparecerá aquí."
            />
          ) : (
            <ul className="space-y-2">
              {progreso.historial.map((s) => (
                <li
                  key={s.semana}
                  className="rounded-lg bg-surface-2 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">
                      Semana del{" "}
                      {format(new Date(`${s.semana}T00:00:00`), "d 'de' MMMM", {
                        locale: es,
                      })}
                    </span>
                    <span className="font-bold text-brand">+{s.xp} XP</span>
                  </div>
                  {s.validadaPorDt && (
                    <p className="mt-1 text-[11px] font-semibold text-brand">
                      Validada por tu DT
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {HABITOS.filter((h) => s.habitos[h])
                      .map((h) => ETIQUETA_HABITO[h])
                      .join(" · ") || "Sin hábitos cumplidos"}
                  </p>
                  {s.nota && (
                    <p className="mt-1 text-xs italic text-muted">“{s.nota}”</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
