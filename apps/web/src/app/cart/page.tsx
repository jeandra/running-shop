"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import StorefrontShell from "@/components/storefront-shell";

type CartItem = {
  id: string;
  quantity: number;
  variant: { id: string; sizeEu: number; sku: string; stock: number };
  product: { id: string; name: string; slug: string; brand: string; price: number; image: string | null };
};

type Cart = {
  id: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
        if (!ignore && res.ok) setCart(await res.json());
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function updateQty(itemId: string, quantity: number) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) setCart(await res.json());
    } finally {
      setBusyId(null);
    }
  }

  async function remove(itemId: string) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setCart(await res.json());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <StorefrontShell>
      <Link href="/" className="text-body font-medium text-charcoal">
        ← Katalog
      </Link>
      <h1 className="font-recklessneue-book text-[21px] leading-[1.5] text-ink-black">Keranjang</h1>

      {loading ? (
        <p className="text-body text-concrete">Memuat...</p>
      ) : !cart || cart.items.length === 0 ? (
        <p className="text-body text-concrete">Keranjang kosong.</p>
      ) : (
        <>
          <ul className="flex flex-1 list-none flex-col gap-[6px] overflow-y-auto p-0 pr-[4px]">
            {cart.items.map((item) => (
              <li
                key={item.id}
                className="flex gap-[6px] rounded-[6px] border border-charcoal bg-paper-white p-[12px] shadow-[rgba(0,0,0,0.08)_1px_1px_6px_-1px]"
              >
                <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-[6px] border border-paper-white bg-bone">
                  {item.product.image ? (
                    <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="48px" />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-[2px]">
                  <p className="text-body font-medium text-charcoal">{item.product.name}</p>
                  <p className="text-body-sm text-concrete">
                    EU {item.variant.sizeEu} · Rp {item.product.price.toLocaleString("id-ID")}
                  </p>
                  <div className="flex items-center gap-[6px]">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      disabled={busyId === item.id}
                      className="rounded-[6px] border border-charcoal px-[8px] py-[2px] text-body font-medium text-charcoal disabled:opacity-50"
                    >
                      −
                    </button>
                    <span className="text-body text-charcoal">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      disabled={busyId === item.id}
                      className="rounded-[6px] border border-charcoal px-[8px] py-[2px] text-body font-medium text-charcoal disabled:opacity-50"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={busyId === item.id}
                      className="ml-auto text-body-sm font-medium text-signal-red disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-charcoal/20 pt-[8px]">
            <span className="text-body font-medium text-charcoal">Subtotal</span>
            <span className="text-body font-medium text-ink-black">
              Rp {cart.subtotal.toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-body-sm text-concrete">{cart.totalItems} item</p>
        </>
      )}
    </StorefrontShell>
  );
}
