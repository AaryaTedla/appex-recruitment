import { getTestAccess } from "@/lib/testAccess";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/candidate/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const testOpen = await getTestAccess();
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-lg px-5 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Join APPEX</p>
        <h1 className="mt-3 text-3xl font-bold">Tell us who you are.</h1>
        {!testOpen && <p role="status" className="mt-5 text-sm text-amber-200">New tests are closed. If you already started, use the same SRN and name to resume.</p>}
        <Card className="mt-8 p-6 sm:p-7"><RegisterForm /></Card>
      </div>
    </main>
  );
}
