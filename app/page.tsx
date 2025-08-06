"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // 強制的に/homeにリダイレクト
    router.replace("/home");
  }, [router]);

  return null; // 何も表示しない
} 