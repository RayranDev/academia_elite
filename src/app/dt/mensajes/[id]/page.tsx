import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/session";
import { obtenerConversacionDetalle } from "@/services/mensaje.service";
import { DomainError } from "@/lib/errors";
import { ThreadView } from "@/components/messages/ThreadView";

export default async function DtThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();

  let conv;
  try {
    conv = await obtenerConversacionDetalle(ctx, id);
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <Link href="/dt/mensajes" className="text-sm text-muted hover:text-foreground">
        ← Volver a mensajes
      </Link>
      <ThreadView conv={conv} />
    </div>
  );
}
