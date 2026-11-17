import Image from "next/image";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

export const dynamic = "force-dynamic";

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  gender: string;
  price: number;
  image: string | null;
  category: { name: string; slug: string };
  stockTotal: number;
  sku?: string | null;
};

type ProductList = {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const TABS = ["Sneak", "Shop", "Wishlist"] as const;
const ACTIVE_TAB = "Sneak";

export default async function Home() {
  const res = await fetch(`${API_URL}/products?limit=12`, { cache: "no-store" });
  const data: ProductList = res.ok ? await res.json() : ({ items: [] } as unknown as ProductList);
  const items = data.items ?? [];
  const featured = items[0];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-paper-white">
      {/* Media backdrop */}
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

      {/* Glass panel */}
      <section
        aria-label="Katalog produk"
        className="absolute right-0 top-0 flex h-full w-[35%] min-w-[320px] max-w-[420px] flex-col gap-[12px] rounded-[6px] border-l border-charcoal/20 bg-[rgba(255,255,255,0.7)] p-[16px] shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px] backdrop-blur-xl"
      >
        {/* Tab bar */}
        <div className="flex gap-[6px]">
          {TABS.map((tab) => (
            <span
              key={tab}
              className={`rounded-[6px] px-[10px] py-[2px] text-body font-medium tracking-[0.5px] ${
                tab === ACTIVE_TAB
                  ? "bg-smoke text-paper-white"
                  : "text-charcoal"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Schedule toggle */}
        <div className="flex gap-[6px]">
          <span className="rounded-[6px] bg-signal-red px-[7px] py-[5px] text-caption font-medium uppercase tracking-[0.5px] text-paper-white">
            LIVE
          </span>
          <span className="rounded-[6px] border border-charcoal px-[7px] py-[5px] text-caption font-medium uppercase tracking-[0.5px] text-charcoal">
            SCHEDULE
          </span>
        </div>

        {/* View counter */}
        <div className="flex items-center gap-[6px] text-caption text-charcoal">
          <Image src="/eye.svg" alt="" width={12} height={12} className="h-[12px] w-[12px]" />
          <span>284</span>
        </div>

        {/* Now Playing card */}
        <div className="rounded-[6px] border border-charcoal/0 bg-paper-white p-[16px] shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px]">
          <p className="text-caption font-medium uppercase tracking-[0.6px] text-charcoal">
            NOW PLAYING
          </p>
          <h2 className="mt-[6px] font-recklessneue-book text-[21px] leading-[1.5] text-ink-black">
            Quiet Motion
          </h2>
          <p className="mt-[6px] text-body font-normal leading-[1.5] tracking-[0.456px] text-charcoal">
            A slow walk through the city at dusk. The rhythm of footsteps on wet pavement, the hum of streetlights, the quiet between heartbeats.
          </p>
        </div>

        {/* Artist / Brand bar */}
        <div className="flex items-center gap-[8px]">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-bone text-caption font-medium text-charcoal">
            {featured?.brand?.charAt(0) ?? "A"}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-body font-medium text-charcoal">{featured?.brand ?? "Adidas"}</span>
            <span className="text-body-sm text-concrete">example.com/artist</span>
          </div>
          <Image src="/external-link.svg" alt="" width={12} height={12} className="h-[12px] w-[12px]" />
        </div>

        {/* Product list (scrollable) */}
        <ul className="flex flex-1 list-none flex-col gap-[6px] overflow-y-auto p-0 pr-[4px]">
          {items.length === 0 ? (
            <li className="text-body text-concrete">Belum ada produk.</li>
          ) : (
            items.map((product) => (
              <li
                key={product.id}
                className="flex gap-[6px] rounded-[6px] border border-charcoal bg-paper-white p-[16px] shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px]"
              >
                <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[6px] border border-paper-white bg-bone">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-[6px]">
                  <p className="text-body font-medium tracking-[0.456px] text-charcoal">{product.name}</p>
                  <p className="text-body-sm text-concrete">{product.brand}</p>
                  {product.sku ? (
                    <p className="text-body font-normal tracking-[0.456px] text-charcoal">{product.sku}</p>
                  ) : null}
                  <p className="text-body font-medium text-ink-black">
                    Rp {product.price.toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="self-start rounded-[6px] bg-bone px-2 py-1 text-caption font-medium uppercase tracking-[0.5px] text-signal-red">
                  SHOP
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
