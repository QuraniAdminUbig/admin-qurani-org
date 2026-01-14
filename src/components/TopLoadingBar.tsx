"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "@/app/nprogress.css";

export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      NProgress.configure({ showSpinner: false, trickleSpeed: 150 });
      NProgress.start();

      const timer = setTimeout(() => {
        NProgress.done();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Jika di mobile, pastikan progress bar tidak muncul
      NProgress.done();
    }
  }, [pathname, searchParams]);

  return null;
}
