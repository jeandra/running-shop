"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import StorefrontShell from "@/components/storefront-shell";

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

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const specs = specRows(product);

  async function addToCart() {
    if (!selected) {
      setMsg("Pilih ukuran dulu.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variantId: selected, quantity: 1 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMsg(body?.message ?? "Gagal menambahkan.");
        return;
      }
      setMsg("Ditambahkan ke keranjang.");
    } catch {
      setMsg("Gagal menambahkan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StorefrontShell>
      <Link href="/" className="text-body font-medium text-charcoal">
        ← Katalog
      </Link>

      <div className="relative aspect-square w-full overflow-hidden rounded-[6px] border border-charcoal/20 bg-bone">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="420px" />
        ) : null}
      </div>

      <div className="flex flex-col gap-[2px]">
        <p className="text-body-sm font-medium uppercase tracking-[0.5px] text-concrete">{product.brand}</p>
        <h1 className="font-recklessneue-book text-[21px] leading-[1.5] text-ink-black">{product.name}</h1>
        <p className="text-body font-medium text-ink-black">Rp {product.price.toLocaleString("id-ID")}</p>
      </div>

      <div className="flex flex-col gap-[6px]">
        <p className="text-caption font-medium uppercase tracking-[0.6px] text-charcoal">UKURAN (EU)</p>
        <div className="flex flex-wrap gap-[6px]">
          {product.variants.length === 0 ? (
            <span className="text-body text-concrete">Tidak ada varian.</span>
          ) : (
            product.variants.map((v) => {
              const disabled = v.stock <= 0;
              const active = selected === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(v.id)}
                  className={`rounded-[6px] border px-[10px] py-[5px] text-body font-medium ${
                    disabled
                      ? "border-concrete text-concrete opacity-50"
                      : active
                      ? "border-charcoal bg-charcoal text-paper-white"
                      : "border-charcoal text-charcoal"
                  }`}
                >
                  {v.sizeEu}
                </button>
              );
            })
          )}
        </div>
      </div>

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

      {product.description ? (
        <p className="text-body leading-[1.5] text-charcoal">{product.description}</p>
      ) : null}

      <button
        type="button"
        onClick={addToCart}
        disabled={busy || product.variants.length === 0}
        className="mt-auto rounded-[6px] bg-charcoal px-[12px] py-[8px] text-body font-medium uppercase tracking-[0.5px] text-paper-white disabled:opacity-60"
      >
        {busy ? "MENAMBAHKAN..." : "ADD TO CART"}
      </button>
      {msg ? <p className="text-body-sm text-charcoal">{msg}</p> : null}
      <Link href="/cart" className="text-body-sm font-medium text-charcoal underline">
        Lihat keranjang
      </Link>
    </StorefrontShell>
  );
}
