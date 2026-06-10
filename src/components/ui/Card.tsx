import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-subtle bg-surface p-6 shadow-lg shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
