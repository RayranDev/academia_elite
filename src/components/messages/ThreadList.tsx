import Link from "next/link";
import type { ConversacionResumenDTO } from "@/services/mensaje.service";

export function ThreadList({
  conversaciones,
  basePath,
}: {
  conversaciones: ConversacionResumenDTO[];
  basePath: string;
}) {
  if (conversaciones.length === 0) {
    return <p className="text-sm text-muted">No hay conversaciones todavía.</p>;
  }
  return (
    <ul className="space-y-2">
      {conversaciones.map((c) => (
        <li key={c.id}>
          <Link
            href={`${basePath}/${c.id}`}
            className="block rounded-lg border border-subtle bg-surface-2 p-3 hover:border-brand"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.asunto}</span>
              <span className="text-[11px] text-muted">
                {new Date(c.actualizada).toLocaleDateString("es")}
              </span>
            </div>
            {c.ultimoMensaje && (
              <p className="mt-1 line-clamp-1 text-sm text-muted">
                {c.ultimoMensaje}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
