import { NuevaPasswordForm } from "@/components/auth/NuevaPasswordForm";

export const metadata = { title: "Nueva contraseña — Academia Elite" };

// Next 16: params es asíncrono.
export default async function NuevaPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <NuevaPasswordForm token={token} />;
}
