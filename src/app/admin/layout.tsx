import { requirePanelUser } from "@/lib/auth/session";
import { PanelShell } from "@/components/PanelShell";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePanelUser("SUPER_ADMIN");
  return (
    <PanelShell rol="SUPER_ADMIN" nombre={user.nombre}>
      <AdminNav />
      {children}
    </PanelShell>
  );
}
