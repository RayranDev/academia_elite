import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  titulo,
  texto,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-subtle bg-surface/40 px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-muted" aria-hidden />
      <p className="mt-3 font-semibold">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-muted">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
