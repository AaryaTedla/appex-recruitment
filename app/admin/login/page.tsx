import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header admin />
      <div className="mx-auto max-w-md px-5 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Evaluator Access</p>
        <h1 className="mt-3 text-3xl font-bold">APPEX evaluation.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">This area is only for authorized APPEX evaluators and admins.</p>
        <Card className="mt-8 p-6 sm:p-7"><AdminLoginForm /></Card>
      </div>
    </main>
  );
}
