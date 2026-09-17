"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchBox({
  initialValue = "",
  placeholder = "Buscar...",
}: {
  initialValue?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialValue);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("pagina");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(handle);
  }, [value, pathname, router]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}
