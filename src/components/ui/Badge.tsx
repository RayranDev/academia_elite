import { cn } from "@/lib/cn";

const TONOS: Record<string, string> = {
  neutral: "bg-subtle text-muted",
  pitch: "bg-pitch/15 text-pitch",
  info: "bg-info/15 text-info",
  alerta: "bg-alerta/15 text-alerta",
  oro: "bg-oro/15 text-oro",
};

export function Badge({
  children,
  tono = "neutral",
  className,
}: {
  children: React.ReactNode;
  tono?: keyof typeof TONOS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}
