import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white mx-auto mb-6">
          EF
        </div>
        <h1 className="text-6xl font-bold text-white mb-3">404</h1>
        <p className="text-lg text-white/50 mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
