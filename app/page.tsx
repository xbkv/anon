"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isGuest = document.cookie.includes("guest=true");

    if (isGuest) {
      router.push("/home"); // Cookieがある場合は/homeにリダイレクト
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="max-w-md w-full p-8 rounded-3xl shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mt-6 text-gray-800 dark:text-white">
            界隈の今がわかる掲示板
          </h1>
          <p className="text-lg mt-2 text-gray-600 dark:text-gray-300">
            最新情報をチェックしよう。
          </p>
        </div>

        {/* ボタン */}
        <div className="space-y-4">
          <button
            onClick={() => {
              // cookie保存やrouter.pushのみ
              window.location.href = "/home";
            }}
            className="w-full py-3 text-lg font-medium text-purple-500 border border-purple-500 rounded-full hover:bg-purple-100 transition"
          >
            ゲストとして続行
          </button>
        </div>
      </div>
    </div>
  );
}
