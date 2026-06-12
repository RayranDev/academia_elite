"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { UsuarioEditarModal } from "@/components/gestion/UsuarioEditarModal";
import { ResetPasswordButton } from "@/components/gestion/ResetPasswordButton";
import { resetPasswordUsuarioAction } from "@/actions/gestion.actions";
import { ROLES } from "@/types";
import type { UsuarioAdminDTO } from "@/services/admin-usuarios.service";

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

export function UsuariosGestion({ usuarios }: { usuarios: UsuarioAdminDTO[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [escuela, setEscuela] = useState("");
  const [editando, setEditando] = useState<UsuarioAdminDTO | null>(null);

  const SIN_ESCUELA = "__sin__";

  // Lista de escuelas presente en los datos (orden alfabético).
  const escuelas = useMemo(
    () =>
      Array.from(
        new Set(usuarios.map((u) => u.escuelaNombre).filter((n): n is string => !!n)),
      ).sort((a, b) => a.localeCompare(b)),
    [usuarios],
  );
  const hayUsuariosSinEscuela = useMemo(
    () => usuarios.some((u) => !u.escuelaNombre),
    [usuarios],
  );

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (rol && u.rol !== rol) return false;
      if (escuela === SIN_ESCUELA && u.escuelaNombre) return false;
      if (escuela && escuela !== SIN_ESCUELA && u.escuelaNombre !== escuela) return false;
      if (
        texto &&
        !u.nombre.toLowerCase().includes(texto) &&
        !u.email.toLowerCase().includes(texto)
      ) {
        return false;
      }
      return true;
    });
  }, [usuarios, q, rol, escuela]);

  function cerrar(cambio: boolean) {
    setEditando(null);
    if (cambio) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar usuario"
            className={`${input} pl-8`}
          />
        </div>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className={input} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {(escuelas.length > 0 || hayUsuariosSinEscuela) && (
          <select
            value={escuela}
            onChange={(e) => setEscuela(e.target.value)}
            className={input}
            aria-label="Filtrar por escuela"
          >
            <option value="">Todas las escuelas</option>
            {escuelas.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            {hayUsuariosSinEscuela && <option value={SIN_ESCUELA}>Sin escuela</option>}
          </select>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Users} titulo="Sin usuarios" texto="Ningún usuario coincide con la búsqueda." />
      ) : (
        <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
          {filtrados.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 hover:bg-surface-2/50">
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{u.nombre}</p>
                <p className="break-all text-xs text-muted">
                  {u.email}
                  {u.escuelaNombre && <> · {u.escuelaNombre}</>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tono="info">{u.rol}</Badge>
                {!u.activo && <Badge tono="alerta">Inactivo</Badge>}
                {u.bloqueado && <Badge tono="alerta">Bloqueado</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditando(u)}>
                  Editar
                </Button>
                <ResetPasswordButton
                  action={resetPasswordUsuarioAction}
                  campos={{ userId: u.id }}
                  destinatario={u.email}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && <UsuarioEditarModal usuario={editando} onClose={cerrar} />}
    </div>
  );
}
