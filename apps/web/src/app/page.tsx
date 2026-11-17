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
};

type ProductList = {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default async function Home() {
  const res = await fetch(`${API_URL}/products?limit=12`, { cache: "no-store" });
  const data: ProductList = await res.json();
  const items = data.items ?? [];

  return (
    <main className="min-h-screen bg-paper-white">
      <section
        aria-label="Katalog produk"
        className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col gap-6 border-r border-charcoal/20 bg-[rgba(255,255,255,0.7)] p-4 backdrop-blur-xl"
      >
        <h1 className="text-heading-sm font-medium text-ink-black">Running Shop</h1>
        <ul className="flex flex-1 list-none flex-col gap-6 p-0">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex gap-4 rounded-[6px] border border-charcoal bg-paper-white p-4 shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px]"
            >
              <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[6px] border border-paper-white bg-bone">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-1">
                <p className="text-body font-medium text-charcoal">{product.name}</p>
                <p className="text-body-sm text-concrete">{product.brand}</p>
                <p className="text-body font-semibold text-ink-black">Rp {product.price}</p>
              </div>
              <span className="self-start rounded-[6px] bg-bone px-2 py-1 text-caption font-medium uppercase text-signal-red">
                SHOP
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
