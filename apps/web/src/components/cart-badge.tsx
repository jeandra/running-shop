"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/cart", { credentials: "include", cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active) setCount(data.totalItems ?? 0);
        }
      } catch {
        // ignore
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex justify-end">
      <Link
        href="/cart"
        className="rounded-[6px] border border-charcoal bg-paper-white px-[10px] py-[4px] text-body-sm font-medium text-charcoal"
      >
        Keranjang{count > 0 ? ` (${count})` : ""}
      </Link>
    </div>
  );
}
