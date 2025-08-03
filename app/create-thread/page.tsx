"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdBanner from "@/components/AdBanner";

export default function CreateThreadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [sage, setSage] = useState(false);
  const [showId, setShowId] = useState(false);
  const [forceId, setForceId] = useState(false);
  const [avoidSearch, setAvoidSearch] = useState(false);
  const [rejectNew, setRejectNew] = useState(false);
  const [voiceChat, setVoiceChat] = useState(false);
  const [pollType, setPollType] = useState("");
  const [mainColor, setMainColor] = useState("black");
  const [loading, setLoading] = useState(false);

  const colors = [
    { value: "red", label: "主", className: "text-red-600" },
    { value: "blue", label: "主", className: "text-blue-600" },
    { value: "indigo", label: "主", className: "text-indigo-600" },
    { value: "pink", label: "主", className: "text-pink-400" },
    { value: "orange", label: "主", className: "text-orange-400" },
    { value: "purple", label: "主", className: "text-purple-600" },
    { value: "orange-dark", label: "主", className: "text-orange-600" },
    { value: "green", label: "主", className: "text-green-600" },
    { value: "gray-light", label: "主", className: "text-gray-400" },
    { value: "gray-dark", label: "主", className: "text-gray-700" },
    { value: "cyan", label: "主", className: "text-cyan-500" },
    { value: "magenta", label: "主", className: "text-pink-600" },
    { value: "olive", label: "主", className: "text-yellow-700" },
    { value: "gray", label: "主", className: "text-gray-600" },
    { value: "salmon", label: "主", className: "text-red-400" },
    { value: "lightblue", label: "主", className: "text-blue-400" },
    { value: "lightpink", label: "主", className: "text-pink-300" },
    { value: "lightblue2", label: "主", className: "text-blue-300" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("タイトルと本文は必須です");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: content.trim(),
          name: name.trim() || "名無しさん",
          email: email.trim(),
          sage,
          showId,
          forceId,
          avoidSearch,
          rejectNew,
          voiceChat,
          pollType,
          mainColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/threads/${data._id}`);
      } else {
        const error = await response.json();
        alert(error.message || "スレッド作成に失敗しました");
      }
    } catch (error) {
      console.error("スレッド作成エラー:", error);
      alert("スレッド作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
    }}>
      {/* 上部広告エリア */}
      <div className="w-full border-b-2 border-gray-300 py-4" style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
      }}>
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner type="wide" />
        </div>
      </div>

      {/* ヘッダー */}
      <div className="border-b border-gray-200 py-3 shadow-sm" style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
      }}>
        <div className="max-w-4xl mx-auto px-4">
          <a href="/home" className="text-pink-600 hover:text-pink-700 font-medium">
            掲示板トップに戻る
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8" style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
      }}>
        {/* 投稿前の注意事項 */}
        <div className="border border-gray-200 p-6 mb-8 rounded-lg shadow-sm" style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
        }}>
          <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-sm">
            <h2 className="text-red-700 font-bold text-lg mb-4 flex items-center">
              <span className="mr-2">■</span>
              投稿する前に:
            </h2>
            <ul className="text-red-600 space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>迷惑行為、スレ乱立は厳禁</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>悪質な場合は永久アク禁</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>みんなが楽しいルールを作ろうね</span>
              </li>
            </ul>
          </div>
        </div>

        {/* スレッド作成フォーム */}
        <div className="border border-gray-200 p-8 rounded-lg shadow-sm" style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
        }}>
          <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold mb-8 flex items-center">
              <span className="mr-2">■</span>
              新規スレ作成:
            </h2>
          
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 基本情報 */}
              <div className="space-y-6 max-w-2xl mx-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タイトル:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    名前:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eメール:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    本文:
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400"
                    rows={8}
                    maxLength={5000}
                    required
                  />
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="text-center pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-bold py-4 px-12 rounded text-lg transition-colors shadow-md hover:shadow-lg"
                >
                  {loading ? "作成中..." : "新規スレッド作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 下部広告エリア */}
      <div className="w-full border-t-2 border-gray-300 py-4 mt-8" style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
      }}>
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner type="wide" />
        </div>
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
} 