import { VerificarEmail } from "@/components/auth/VerificarEmail";

export const metadata = { title: "Verificar correo — Academia Elite" };

// Next 16: params es asíncrono.
export default async function VerificarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VerificarEmail token={token} />;
}
