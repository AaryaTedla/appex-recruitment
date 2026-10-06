import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireEvaluator } from "@/lib/auth/admin";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const identity = await requireEvaluator();

  return (
    <div className="min-h-screen">
      <Header admin />
      <AdminNav role={identity.role} />
      {children}
    </div>
  );
}
