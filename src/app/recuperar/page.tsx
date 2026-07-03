import { RecuperarForm } from "@/components/auth/RecuperarForm";

export const metadata = { title: "Recuperar acceso — Academia Elite" };

// Next 16: searchParams es asíncrono. La activación de cuenta llega con
// ?paso=codigo&email=... (el correo precargado; el código lo tipea el usuario).
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string; email?: string }>;
}) {
  const { paso, email } = await searchParams;
  return (
    <RecuperarForm initialEmail={email ?? ""} directoACodigo={paso === "codigo"} />
  );
}
