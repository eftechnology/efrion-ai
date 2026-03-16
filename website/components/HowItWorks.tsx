const steps = [
  {
    number: "01",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    color: "text-blue-400",
    bg: "bg-blue-600/10 border-blue-500/20",
    glow: "shadow-blue-600/20",
    title: "Speak Naturally",
    description:
      "No commands to memorize. Just say what you want — \"Create an invoice for AWS for $1,500\" — and EFRION starts listening in real time.",
    detail: "16kHz PCM audio stream via AudioWorklet",
  },
  {
    number: "02",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-violet-400",
    bg: "bg-violet-600/10 border-violet-500/20",
    glow: "shadow-violet-600/20",
    title: "AI Sees & Reasons",
    description:
      "Gemini 2.5 Live simultaneously processes your voice, live screenshots, and a real-time accessibility tree to understand context with precision.",
    detail: "Screenshot + DOM accessibility tree diff",
  },
  {
    number: "03",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7a14.9 14.9 0 012.58-5.84" />
      </svg>
    ),
    color: "text-green-400",
    bg: "bg-green-600/10 border-green-500/20",
    glow: "shadow-green-600/20",
    title: "Action Taken",
    description:
      "A ghost cursor flies to the target, clicks, types, scrolls, and completes your workflow. The animated HUD keeps you informed at every step.",
    detail: "Ghost cursor · click · type · scroll · verify",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-blue-500/20 bg-blue-500/8 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
            How It Works
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Three steps. Zero friction.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            EFRION bridges the gap between human intent and ERP execution through
            a continuous loop of hearing, seeing, and acting.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all hover:border-white/10 hover:bg-white/[0.04]"
            >
              {/* Number badge */}
              <div className="absolute right-5 top-5 font-mono text-4xl font-black text-white/[0.04] select-none">
                {step.number}
              </div>

              {/* Icon */}
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl border ${step.bg} ${step.color} shadow-lg ${step.glow}`}>
                {step.icon}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
              </div>

              {/* Technical detail chip */}
              <div className="mt-auto rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[10px] text-slate-500">
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
