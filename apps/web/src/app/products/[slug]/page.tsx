import ProductDetailClient from "@/components/product-detail-client";
import StorefrontShell from "@/components/storefront-shell";
import Link from "next/link";

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

  return <ProductDetailClient product={product} />;
}
