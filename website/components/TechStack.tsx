const stack = [
  {
    name: "Gemini 2.5 Live",
    sub: "Multimodal AI Engine",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <circle cx="12" cy="12" r="10" className="fill-[#4285F4]/20" />
        <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.4A6.4 6.4 0 015.6 12 6.4 6.4 0 0112 5.6a6.4 6.4 0 016.4 6.4A6.4 6.4 0 0112 18.4z" className="fill-[#4285F4]"/>
        <path d="M12 8.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4z" className="fill-[#34A853]"/>
      </svg>
    ),
    color: "border-[#4285F4]/20 bg-[#4285F4]/5",
    text: "text-[#4285F4]",
  },
  {
    name: "Chrome Extension",
    sub: "Manifest V3",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <circle cx="12" cy="12" r="10" className="fill-[#EA4335]/10" />
        <circle cx="12" cy="12" r="4" className="fill-[#4285F4]" />
        <path d="M12 8h8.46A10 10 0 0112 2V8z" className="fill-[#EA4335]" />
        <path d="M12 8H3.54A10 10 0 0012 22V8z" className="fill-[#34A853]" />
        <path d="M12 8H3.54A10 10 0 0112 2v6z" className="fill-[#FBBC05]" />
      </svg>
    ),
    color: "border-[#EA4335]/20 bg-[#EA4335]/5",
    text: "text-[#EA4335]",
  },
  {
    name: "FastAPI",
    sub: "Python Backend",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" className="fill-[#05998b]/10" />
        <path d="M12 4l8 14H4L12 4z" className="fill-[#05998b]/80" />
        <path d="M12 9l4 7H8l4-7z" className="fill-[#05998b]" />
      </svg>
    ),
    color: "border-[#05998b]/20 bg-[#05998b]/5",
    text: "text-[#05998b]",
  },
  {
    name: "WebSocket",
    sub: "Bidirectional Real-time",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
      </svg>
    ),
    color: "border-blue-400/20 bg-blue-400/5",
    text: "text-blue-400",
  },
  {
    name: "AudioWorklet",
    sub: "16kHz PCM Streaming",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: "border-purple-400/20 bg-purple-400/5",
    text: "text-purple-400",
  },
  {
    name: "TypeScript",
    sub: "Extension + Website",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="4" className="fill-[#3178C6]" />
        <path d="M14.5 13v-.75h-5v.75h1.875V18H13v-5h1.5z" className="fill-white" />
        <path d="M7 12.25v1h2.5V18H11v-4.75h2.5v-1H7z" className="fill-white" />
      </svg>
    ),
    color: "border-[#3178C6]/20 bg-[#3178C6]/5",
    text: "text-[#3178C6]",
  },
  {
    name: "Next.js 16",
    sub: "Promo Website",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
        <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747C23.533 5.48 20.361 1.7 16.035.293 15.26.046 14.44-.123 13.508.052c-.363.04-1.935.04-2.299 0C10.747.04 11.572 0 11.572 0z" />
      </svg>
    ),
    color: "border-white/10 bg-white/5",
    text: "text-white",
  },
  {
    name: "Tailwind CSS v4",
    sub: "Styling",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path d="M12 6C9.6 6 8.1 7.2 7.5 9.6c.9-1.2 1.95-1.65 3.15-1.35.685.17 1.174.664 1.716 1.21C13.313 10.48 14.099 11.3 15.75 11.3c2.4 0 3.9-1.2 4.5-3.6-.9 1.2-1.95 1.65-3.15 1.35-.685-.17-1.174-.664-1.716-1.21C14.437 6.82 13.651 6 12 6zm-4.5 5.7C5.1 11.7 3.6 12.9 3 15.3c.9-1.2 1.95-1.65 3.15-1.35.685.17 1.174.664 1.716 1.21C8.813 16.18 9.599 17 11.25 17c2.4 0 3.9-1.2 4.5-3.6-.9 1.2-1.95 1.65-3.15 1.35-.685-.17-1.174-.664-1.716-1.21C9.937 12.52 9.151 11.7 7.5 11.7z" className="fill-[#38BDF8]" />
      </svg>
    ),
    color: "border-[#38BDF8]/20 bg-[#38BDF8]/5",
    text: "text-[#38BDF8]",
  },
];

export default function TechStack() {
  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Built with
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {stack.map((tech) => (
            <div
              key={tech.name}
              className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${tech.color}`}
            >
              {tech.icon}
              <div className="text-center">
                <div className={`text-xs font-bold ${tech.text}`}>{tech.name}</div>
                <div className="text-[9px] text-slate-600 mt-0.5 leading-tight">{tech.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
