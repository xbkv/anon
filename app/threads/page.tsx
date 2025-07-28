"use client";
import { useEffect, useState } from "react";

// 投稿データ型
interface Post {
  _id: string;
  threadId: string;
  content: string;
  createdAt: string;
}

export default function ThreadTimeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // 最新投稿を取得
  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch("/api/posts/latest");
      if (res.ok) {
        setPosts(await res.json());
      }
    }
    fetchPosts();
    const interval = setInterval(fetchPosts, 5000); // 5秒ごとに自動更新
    return () => clearInterval(interval);
  }, []);

  // 投稿処理
  async function handlePost() {
    if (!content.trim()) return;
    setLoading(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setLoading(false);
    if (res.ok) {
      setContent("");
      // 即時反映
      const newPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* サイドバー */}
      <aside className="w-20 md:w-64 flex flex-col items-center md:items-start py-8 px-2 bg-zinc-900 border-r border-zinc-800 min-h-screen">
        <div className="mb-8 text-2xl font-bold tracking-widest">🦌</div>
        <nav className="flex flex-col gap-6 w-full">
          <a className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-zinc-800 transition" href="/home">
            <span className="material-icons">home</span>
            <span className="hidden md:inline">Home</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-zinc-800 transition" href="#">
            <span className="material-icons">explore</span>
            <span className="hidden md:inline">Explore</span>
          </a>
        </nav>
      </aside>

      {/* メインタイムライン */}
      <main className="flex-1 max-w-2xl mx-auto border-x border-zinc-800 min-h-screen">
        {/* 投稿フォーム */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-950">
          <textarea
            className="w-full bg-zinc-900 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            placeholder="いまどうしてる？（匿名で投稿）"
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={loading}
          />
          <div className="flex justify-end mt-2">
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50"
              onClick={handlePost}
              disabled={loading || !content.trim()}
            >
              投稿
            </button>
          </div>
        </div>
        {/* 投稿タイムライン */}
        <div>
          {posts.length === 0 ? (
            <div className="text-center text-zinc-400 py-12">まだ投稿がありません</div>
          ) : (
            posts.map(post => (
              <div key={post._id} className="border-b border-zinc-800 px-6 py-4 flex gap-4 hover:bg-zinc-900 transition">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-xl font-bold">匿名</div>
                <div className="flex-1">
                  <div className="text-sm text-zinc-400 mb-1">{new Date(post.createdAt).toLocaleString()}</div>
                  <div className="text-lg whitespace-pre-wrap break-words">{post.content}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      {/* 右カラム（今は空） */}
      <aside className="hidden lg:block w-80 bg-black"></aside>
    </div>
  );
}
