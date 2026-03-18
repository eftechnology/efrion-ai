import Link from 'next/link';
import Logo from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-6">
      <div className="text-center">
        <Logo size={64} className="mx-auto mb-6 shadow-lg shadow-blue-600/30" />
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
