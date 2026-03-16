const features = [
  {
    icon: "🎙️",
    title: "Voice-First Interface",
    description:
      "Continuous 16kHz PCM audio stream with push-to-talk. Natural language — no rigid commands. Supports mid-sentence barge-in for instant redirection.",
    badge: "Core",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    icon: "👁️",
    title: "Visual + DOM Fusion",
    description:
      "Combines live screenshots with a real-time simplified accessibility tree. Gemini sees both pixels and semantics for pixel-perfect element targeting.",
    badge: "Core",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    icon: "🖱️",
    title: "Ghost Cursor Animation",
    description:
      "An animated cursor visually flies to the target element before clicking, so users always know exactly what the AI is about to do. Builds instant trust.",
    badge: "UX",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  {
    icon: "📋",
    title: "Multi-Step Planning HUD",
    description:
      "Before acting, EFRION announces its plan. A floating HUD displays each step with real-time progress tracking — full transparency, no black-box behavior.",
    badge: "UX",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  {
    icon: "🕵️",
    title: "Dead-End Detection",
    description:
      "After every click, EFRION verifies the DOM actually changed. If it didn't, it automatically reports the failure and self-corrects with a new strategy.",
    badge: "Smart",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  {
    icon: "↩️",
    title: "AI Undo System",
    description:
      "Say \"undo\" and EFRION reverses the last action — restoring typed values or re-clicking toggles. Keeps an in-memory stack of the last 10 actions.",
    badge: "Smart",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  {
    icon: "🔒",
    title: "Safety Lock",
    description:
      "Optional confirmation mode for high-stakes actions. EFRION pauses and asks before submitting, deleting, or navigating away. Confirm by voice or button.",
    badge: "Safety",
    badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  {
    icon: "♻️",
    title: "Cross-Page Persistence",
    description:
      "Session state, action plan, and history survive page reloads and navigation. Multi-step workflows across different ERP pages work seamlessly.",
    badge: "Reliability",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Features
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Built for the real world.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            Every feature was designed around the actual challenges of navigating
            enterprise ERP interfaces — not just demos.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5"
            >
              {/* Shimmer on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100 animate-shimmer" />

              <div className="flex items-start justify-between">
                <span className="text-3xl leading-none">{f.icon}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${f.badgeColor}`}>
                  {f.badge}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
