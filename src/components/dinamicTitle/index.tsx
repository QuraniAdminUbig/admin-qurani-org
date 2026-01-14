"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../providers/i18n-provider";

export default function DynamicTitle() {
  const pathname = usePathname();
  const { t } = useI18n()

  useEffect(() => {
    let title = "Qurani - Modern Quran App";

    if (pathname === "/") title = t('title_meta.default');
    else if (pathname.startsWith("/dashboard")) title = t('title_meta.dashboard');
    else if (pathname.startsWith("/grup")) title = t('title_meta.group');
    else if (pathname.startsWith("/notifikasi")) title = t('title_meta.notification');
    else if (pathname.startsWith("/peta-statistik")) title = t('title_meta.statistik');
    else if (pathname.startsWith("/profile")) title = t('title_meta.profile');

    else if (pathname.startsWith("/teman")) title = t('title_meta.friend');
    else if (pathname.startsWith("/tentang")) title = t('title_meta.about');

    document.title = title;
  }, [pathname, t]);

  return null;
}
