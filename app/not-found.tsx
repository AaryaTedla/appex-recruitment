import Link from "next/link";

export default function NotFound() {
  return (
    <div id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-violet-300">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-zinc-500">That APPEX page does not exist.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-violet-300 hover:text-violet-200">Back home</Link>
      </div>
    </div>
  );
}
