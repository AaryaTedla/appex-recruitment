import type { ReactNode } from "react";
import { AdminNavigation, AdminContent } from "@/components/admin/AdminNavigation";
import { Header } from "@/components/ui/Header";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireEvaluator } from "@/lib/auth/admin";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const identity = await requireEvaluator();

  return (
    <AdminNavigation><div className="min-h-screen">
      <Header admin />
      <AdminNav role={identity.role} />
      <AdminContent>{children}</AdminContent>
    </div></AdminNavigation>
  );
}
