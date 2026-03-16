const layers = [
  {
    label: "User",
    items: [
      { icon: "🎙️", name: "Voice Input", sub: "16kHz PCM" },
      { icon: "🖥️", name: "ERP Screen", sub: "Any web ERP" },
    ],
    color: "border-blue-500/30 bg-blue-500/5",
    labelColor: "text-blue-400",
  },
  {
    label: "Chrome Extension",
    items: [
      { icon: "📸", name: "Screen Capture", sub: "1.5s interval" },
      { icon: "🌳", name: "Accessibility Tree", sub: "DOM diff" },
      { icon: "🎚️", name: "AudioWorklet", sub: "PCM streaming" },
    ],
    color: "border-violet-500/30 bg-violet-500/5",
    labelColor: "text-violet-400",
  },
  {
    label: "FastAPI Backend",
    items: [
      { icon: "🔌", name: "WebSocket Server", sub: "Bidirectional" },
      { icon: "🧠", name: "Tool Orchestration", sub: "6 actions" },
      { icon: "🔒", name: "Safety Lock", sub: "Optional" },
    ],
    color: "border-orange-500/30 bg-orange-500/5",
    labelColor: "text-orange-400",
  },
  {
    label: "Gemini 2.5 Live",
    items: [
      { icon: "👁️", name: "Vision", sub: "Screenshots" },
      { icon: "🗣️", name: "Audio I/O", sub: "Native TTS" },
      { icon: "⚡", name: "Function Calling", sub: "Real-time" },
    ],
    color: "border-green-500/30 bg-green-500/5",
    labelColor: "text-green-400",
  },
];

const actions = [
  { icon: "🖱️", label: "click_element" },
  { icon: "⌨️", label: "type_text" },
  { icon: "📜", label: "scroll_page" },
  { icon: "🔗", label: "navigate_to" },
  { icon: "📖", label: "read_text" },
  { icon: "✨", label: "highlight_element" },
];

function Arrow() {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-1">
      <div className="h-px w-8 bg-gradient-to-r from-white/10 to-white/20" />
      <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </div>
  );
}

export default function Architecture() {
  return (
    <section id="architecture" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-orange-500/20 bg-orange-500/8 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-orange-400">
            Architecture
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Real-time. Event-driven.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            A clean separation of concerns across four layers, connected by a
            bidirectional WebSocket for sub-second latency.
          </p>
        </div>

        {/* Main flow — horizontal on large screens */}
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-start">
          {layers.map((layer, i) => (
            <div key={layer.label} className="flex flex-col items-center gap-3 lg:flex-1">
              <div className={`w-full rounded-xl border p-4 ${layer.color}`}>
                <div className={`mb-3 text-center text-[10px] font-bold uppercase tracking-widest ${layer.labelColor}`}>
                  {layer.label}
                </div>
                <div className="flex flex-col gap-2">
                  {layer.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2"
                    >
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <div className="text-xs font-medium text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Arrow between layers */}
              {i < layers.length - 1 && (
                <div className="hidden lg:block">
                  <Arrow />
                </div>
              )}
              {/* Down arrow on mobile */}
              {i < layers.length - 1 && (
                <svg className="h-5 w-5 text-slate-600 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Tool actions row */}
        <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            AI Actions — Tool Calls executed on the page
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action) => (
              <div
                key={action.label}
                className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2"
              >
                <span className="text-sm">{action.icon}</span>
                <code className="text-xs font-mono text-slate-300">{action.label}</code>
              </div>
            ))}
          </div>
        </div>

        {/* WebSocket callout */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Bidirectional WebSocket at ws://localhost:8000/ws
          </span>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
      </div>
    </section>
  );
}
