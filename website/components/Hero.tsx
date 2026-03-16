export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-16">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Blue radial glow */}
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-2/3 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-16 py-24 lg:grid-cols-2 lg:items-center">
        {/* ── Left: copy ── */}
        <div className="flex flex-col gap-7 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/8 px-4 py-1.5">
            <span className="text-base">🏆</span>
            <span className="text-xs font-semibold tracking-wide text-yellow-400">
              Gemini Live Agent Challenge
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-white lg:text-6xl">
            Your AI Copilot for
            <br />
            <span
              className="animate-gradient-x bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent"
            >
              Any ERP System.
            </span>
          </h1>

          {/* Subline */}
          <p className="max-w-lg text-lg leading-relaxed text-slate-400">
            Just speak. <span className="text-white font-medium">EFRION</span> sees your
            screen, reads the interface, and navigates for you — powered by{" "}
            <span className="text-blue-400 font-medium">Gemini 2.5 Live</span>.
            No mouse. No training. No friction.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-95"
            >
              See How It Works
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="#demo"
              className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/5"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Demo
            </a>
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center gap-6 border-t border-white/[0.06] pt-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Real-time voice & vision
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Chrome Extension (MV3)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Gemini 2.5 multimodal
            </span>
          </div>
        </div>

        {/* ── Right: visual mockup ── */}
        <div className="relative flex justify-center lg:justify-end animate-float">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative w-full max-w-md select-none">
      {/* ERP Window frame */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0a0a10] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs text-slate-500">EFRION ERP — Invoices</span>
        </div>

        {/* ERP Content */}
        <div className="p-5 space-y-4">
          {/* Nav tabs inside ERP */}
          <div className="flex gap-2">
            {["Dashboard", "Invoices", "Reports"].map((tab, i) => (
              <div
                key={tab}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  i === 1
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 bg-white/[0.04]"
                }`}
              >
                {tab}
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-300">Create New Invoice</p>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 text-[10px] text-slate-500">Vendor</div>
              <div className="rounded-md border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                Amazon Web Services
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] text-slate-500">Amount ($)</div>
              <div className="rounded-md border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                1,500.00
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] text-slate-500">Notes</div>
            <div className="rounded-md border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-slate-500 h-10" />
          </div>

          {/* Submit button — highlighted with pulse */}
          <div className="relative inline-block animate-highlight-pulse">
            <div className="rounded-lg border-2 border-yellow-400/70 bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-green-600/30">
              Submit Invoice
            </div>
            {/* SVG pointer arrow */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-float">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-yellow-400 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 6px rgba(250,204,21,0.8))" }}>
                <path d="M12 21l-8-9h6V3h4v9h6l-8 9z" />
              </svg>
            </div>
          </div>
        </div>

        {/* HUD bar */}
        <div className="animate-hud-appear mx-4 mb-4 flex items-center gap-3 rounded-full border border-white/10 bg-[#1a1a24] px-4 py-2.5 shadow-lg">
          {/* Pulsing dot */}
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs font-semibold text-white">AI Online</span>
          <div className="ml-auto h-4 w-px bg-white/10" />
          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
            🤖 Filling amount field…
          </span>
        </div>
      </div>

      {/* Ghost cursor */}
      <div
        className="animate-ghost-cursor pointer-events-none absolute bottom-20 right-12 h-5 w-5 rounded-full bg-rose-500/80 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
        style={{ zIndex: 10 }}
      >
        <div className="animate-pulse-ring absolute inset-0 rounded-full bg-rose-400/50" />
      </div>

      {/* Glow behind the card */}
      <div className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-blue-600/20 via-transparent to-violet-600/10 blur-xl" />
    </div>
  );
}
