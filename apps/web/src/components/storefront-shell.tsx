export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-paper-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/florian-kurrasch-HyivyCRdz14-unsplash.jpg"
      >
        <source src="/7877137-uhd_4096_2160_25fps.mp4" type="video/mp4" />
      </video>
      <section
        aria-label="Katalog produk"
        className="absolute right-0 top-0 flex h-full w-[35%] min-w-[320px] max-w-[420px] flex-col gap-[12px] rounded-[6px] border-l border-charcoal/20 bg-[rgba(255,255,255,0.7)] p-[16px] shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px] backdrop-blur-xl"
      >
        {children}
      </section>
    </main>
  );
}
