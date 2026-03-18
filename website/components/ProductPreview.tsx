import Image from "next/image";

export default function ProductPreview() {
  return (
    <section className="relative overflow-hidden px-6 pb-24">
      {/* Fade from hero background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#05050a] to-transparent" />

      <div className="mx-auto max-w-5xl">
        {/* Browser chrome frame */}
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.04]">
          {/* Address bar */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#0a0a10] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <span className="h-3 w-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex flex-1 items-center justify-center rounded-md bg-white/[0.04] px-4 py-1">
              <span className="text-xs text-slate-500">ai.efrion.com/demo</span>
            </div>
          </div>

          {/* Screenshot */}
          <div className="relative w-full bg-[#0d0d14]">
            <Image
              src="/media/product-preview.jpg"
              alt="EFRION AI Autopilot — product screenshot"
              width={1440}
              height={900}
              className="w-full"
              priority
            />
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-sm text-slate-500">
          EFRION AI Autopilot running inside a browser — voice command triggers real-time ERP navigation
        </p>
      </div>
    </section>
  );
}
