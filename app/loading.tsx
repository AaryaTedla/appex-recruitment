export default function Loading() {
  return (
    <div id="main-content" tabIndex={-1} role="status" className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
        <p className="text-sm text-zinc-500">Loading APPEX…</p>
      </div>
    </div>
  );
}
