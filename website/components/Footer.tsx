export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
                E
              </div>
              <span className="text-base font-semibold text-white">EFRION</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              A real-time AI copilot for ERP systems. Powered by Gemini 2.5 Multimodal
              Live API. Built for the UI Navigator track.
            </p>
            {/* Hackathon badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/8 px-3 py-1.5">
              <span className="text-sm">🏆</span>
              <span className="text-xs font-medium text-yellow-400">
                Gemini Live Agent Challenge
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</p>
              {["Features", "How It Works", "Architecture", "Demo Scenarios"].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm text-slate-500 transition-colors hover:text-white"
                >
                  {l}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Docs</p>
              {["Setup Guide", "Extension Install", "Backend Config", "Test Lab"].map((l) => (
                <span key={l} className="text-sm text-slate-600 cursor-not-allowed select-none">
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Tech highlights */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Stack</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Gemini 2.5 Live",
                "Chrome MV3",
                "FastAPI",
                "WebSocket",
                "AudioWorklet",
                "Next.js 16",
                "TypeScript",
                "Tailwind v4",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-500"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 text-xs text-slate-600 sm:flex-row">
          <span>© 2026 EFRION AI Autopilot. Built with ❤️ for the Gemini Live Agent Challenge.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Powered by Gemini 2.5 Multimodal Live API
          </span>
        </div>
      </div>
    </footer>
  );
}
