import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expirada?: string }>;
}) {
  const sp = await searchParams;
  return <LoginForm expirada={sp.expirada === "1"} />;
}
