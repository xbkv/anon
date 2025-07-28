"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DynamicTitleWrapper() {
  const pathname = usePathname(); 
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState("べるご板");

  useEffect(() => {
    const titles: { [key: string]: string } = {
      "/": "界隈のいまがわかる掲示板",
      "/login": "ログイン",
      "/signup": "新規登録",
      "/dashboard": "ダッシュボード",
    };

    const currentPath = pathname;
    const dynamicTitle = titles[currentPath] || "ホーム";
    setPageTitle(`${dynamicTitle} | べるご板`);
  }, [pathname]);

  return <title>{pageTitle}</title>;
}
