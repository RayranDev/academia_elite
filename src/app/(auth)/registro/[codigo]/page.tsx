import { RegistroForm } from "@/components/RegistroForm";

export default async function RegistroPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <RegistroForm codigo={decodeURIComponent(codigo).toUpperCase()} />
    </main>
  );
}
