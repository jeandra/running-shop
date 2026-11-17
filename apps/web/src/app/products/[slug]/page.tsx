import Image from "next/image";
import Link from "next/link";
import StorefrontShell from "@/components/storefront-shell";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

export const dynamic = "force-dynamic";

type ProductVariant = {
  id: string;
  sizeEu: number;
  sku: string;
  stock: number;
};

type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  gender: string;
  description: string;
  price: number;
  image: string | null;
  weightGram: number | null;
  dropMm: number | null;
  stackMm: number | null;
  cushioning: string | null;
  support: string | null;
  terrain: string | null;
  category: { id: string; name: string; slug: string };
  variants: ProductVariant[];
};

async function fetchDetail(slug: string): Promise<ProductDetail | null> {
  const res = await fetch(`${API_URL}/products/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function specRows(p: ProductDetail): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (p.weightGram != null) rows.push({ label: "Berat", value: `${p.weightGram} g` });
  if (p.dropMm != null) rows.push({ label: "Drop", value: `${p.dropMm} mm` });
  if (p.stackMm != null) rows.push({ label: "Stack", value: `${p.stackMm} mm` });
  if (p.cushioning) rows.push({ label: "Cushioning", value: p.cushioning });
  if (p.support) rows.push({ label: "Support", value: p.support });
  if (p.terrain) rows.push({ label: "Terrain", value: p.terrain });
  return rows;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchDetail(slug);

  if (!product) {
    return (
      <StorefrontShell>
        <p className="text-body text-concrete">Produk tidak ditemukan.</p>
        <Link href="/" className="text-body font-medium text-charcoal underline">
          ← Kembali ke katalog
        </Link>
      </StorefrontShell>
    );
  }

  const specs = specRows(product);

  return (
    <StorefrontShell>
      <Link href="/" className="text-body font-medium text-charcoal">
        ← Katalog
      </Link>

      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[6px] border border-charcoal/20 bg-bone">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="420px" />
        ) : null}
      </div>

      {/* Brand + name + price */}
      <div className="flex flex-col gap-[2px]">
        <p className="text-body-sm font-medium uppercase tracking-[0.5px] text-concrete">{product.brand}</p>
        <h1 className="font-recklessneue-book text-[21px] leading-[1.5] text-ink-black">{product.name}</h1>
        <p className="text-body font-medium text-ink-black">Rp {product.price.toLocaleString("id-ID")}</p>
      </div>

      {/* Size selector */}
      <div className="flex flex-col gap-[6px]">
        <p className="text-caption font-medium uppercase tracking-[0.6px] text-charcoal">UKURAN (EU)</p>
        <div className="flex flex-wrap gap-[6px]">
          {product.variants.length === 0 ? (
            <span className="text-body text-concrete">Tidak ada varian.</span>
          ) : (
            product.variants.map((v) => (
              <span
                key={v.id}
                className={`rounded-[6px] border px-[10px] py-[5px] text-body font-medium ${
                  v.stock > 0
                    ? "border-charcoal text-charcoal"
                    : "border-concrete text-concrete opacity-50"
                }`}
              >
                {v.sizeEu}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Specs */}
      {specs.length > 0 ? (
        <div className="flex flex-col gap-[4px]">
          <p className="text-caption font-medium uppercase tracking-[0.6px] text-charcoal">SPESIFIKASI</p>
          <dl className="flex flex-col gap-[2px]">
            {specs.map((s) => (
              <div key={s.label} className="flex justify-between text-body">
                <dt className="text-concrete">{s.label}</dt>
                <dd className="text-charcoal">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/* Description */}
      {product.description ? (
        <p className="text-body leading-[1.5] text-charcoal">{product.description}</p>
      ) : null}

      {/* Add to cart (visual-only) */}
      <button
        type="button"
        disabled
        title="Segera"
        className="mt-auto rounded-[6px] bg-charcoal px-[12px] py-[8px] text-body font-medium uppercase tracking-[0.5px] text-paper-white opacity-60"
      >
        ADD TO CART (SEGERA)
      </button>
    </StorefrontShell>
  );
}
