"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { UsuarioEditarModal } from "@/components/gestion/UsuarioEditarModal";
import { ResetPasswordButton } from "@/components/gestion/ResetPasswordButton";
import { resetPasswordUsuarioAction } from "@/actions/gestion.actions";
import { Paginacion } from "@/components/ui/Paginacion";
import { ROLES } from "@/types";
import type { UsuarioAdminDTO } from "@/services/admin-usuarios.service";

const input =
  "rounded-lg border border-subtle bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand";

interface UsuariosGestionProps {
  usuarios: UsuarioAdminDTO[];
  schools: { id: string; nombre: string }[];
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export function UsuariosGestion({
  usuarios,
  schools,
  page,
  totalPages,
  totalItems,
  limit,
}: UsuariosGestionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [rol, setRol] = useState(searchParams.get("rol") ?? "");
  const [escuelaId, setEscuelaId] = useState(searchParams.get("escuelaId") ?? "");
  const [limitVal, setLimitVal] = useState(searchParams.get("limit") ?? String(limit));
  const [editando, setEditando] = useState<UsuarioAdminDTO | null>(null);

  const SIN_ESCUELA = "__sin__";

  // Sync state with URL search parameters
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams.get("q") ?? "");
    setRol(searchParams.get("rol") ?? "");
    setEscuelaId(searchParams.get("escuelaId") ?? "");
    setLimitVal(searchParams.get("limit") ?? String(limit));
  }, [searchParams, limit]);

  // Debounce for query search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const query = q.trim();
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
  }, [q, pathname, router, searchParams]);

  function cambiarFiltro(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // reset page to 1
    router.push(`${pathname}?${params.toString()}`);

    if (key === "rol") setRol(value);
    if (key === "escuelaId") setEscuelaId(value);
    if (key === "limit") setLimitVal(value);
  }

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

        <select
          value={rol}
          onChange={(e) => cambiarFiltro("rol", e.target.value)}
          className={input}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={escuelaId}
          onChange={(e) => cambiarFiltro("escuelaId", e.target.value)}
          className={input}
          aria-label="Filtrar por escuela"
        >
          <option value="">Todas las escuelas</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
          <option value={SIN_ESCUELA}>Sin escuela</option>
        </select>

        {/* Selector de cantidad por página (10, 50, 100) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Mostrar:</span>
          <select
            value={limitVal}
            onChange={(e) => cambiarFiltro("limit", e.target.value)}
            className={input}
            aria-label="Cantidad de elementos por página"
          >
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icon={Users} titulo="Sin usuarios" texto="Ningún usuario coincide con la búsqueda." />
      ) : (
        <>
          <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface">
            {usuarios.map((u) => (
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

          <div className="pt-2">
            <Paginacion page={page} totalPages={totalPages} totalItems={totalItems} />
          </div>
        </>
      )}

      {editando && <UsuarioEditarModal usuario={editando} onClose={cerrar} />}
    </div>
  );
}
