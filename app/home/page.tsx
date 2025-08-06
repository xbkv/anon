"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Inter } from "next/font/google";
import AdBanner from "@/components/AdBanner";
import { Thread } from "@/app/types/global";

const inter = Inter({ subsets: ["latin"] });

export default function HomePage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [headlines, setHeadlines] = useState<any[]>([]);
  const [isLoadingHeadlines, setIsLoadingHeadlines] = useState(true);
  const [showHeadlines, setShowHeadlines] = useState(true);
  const [headlineUpdateInterval, setHeadlineUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [newHeadlines, setNewHeadlines] = useState<any[]>([]);
  const [isUpdatingHeadlines, setIsUpdatingHeadlines] = useState(false);
  const [headlinesVersion, setHeadlinesVersion] = useState(0); // バージョン管理用
  const threadsPerPage = 15; // より多くのスレッドを表示

  // URLパラメータから検索クエリを取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      setSearchQuery(q);
      setSearchInput(q);
      setIsSearching(true);
      // 初期タイトル設定
      document.title = `${q} | 地雷掲`;
    } else {
      setSearchQuery("");
      setSearchInput("");
      setIsSearching(false);
      // 初期タイトル設定
      document.title = "地雷掲";
    }
  }, []);

  // 動的タイトル設定
  useEffect(() => {
    if (isSearching && searchQuery) {
      document.title = `${searchQuery} | 地雷掲`;
    } else {
      document.title = "地雷掲";
    }
  }, [isSearching, searchQuery]);

  // スレッド一覧取得
  useEffect(() => {
    async function fetchThreads() {
      try {
        const res = await fetch("/api/threads");
        if (res.ok) {
          const data = await res.json();
        setThreads(data);
          
          // 投稿数を一括で取得（パフォーマンス改善）
          const postCounts: { [key: string]: number } = {};
          
          // 並列で投稿数を取得（レート制限を考慮して遅延を追加）
          const promises = data.map(async (thread: Thread, index: number) => {
            try {
              // レート制限を避けるために少し遅延を追加
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              const postsRes = await fetch(`/api/posts?threadId=${thread._id}&page=1&limit=1`);
              if (postsRes.ok) {
                const postsData = await postsRes.json();
                console.log(`スレッド ${thread.title} の投稿データ:`, postsData);
                
                let count = 0;
                if (postsData.pagination && postsData.pagination.totalPosts !== undefined) {
                  count = postsData.pagination.totalPosts;
                  console.log(`スレッド ${thread.title} の投稿数:`, count);
                } else if (Array.isArray(postsData.posts)) {
                  count = postsData.posts.length;
                } else if (Array.isArray(postsData)) {
                  count = postsData.length;
                }
                
                postCounts[thread._id] = count;
              } else if (postsRes.status === 429) {
                console.warn(`レート制限により投稿数取得をスキップ (${thread._id})`);
                postCounts[thread._id] = 0;
              } else {
                console.error(`投稿数取得失敗 (${thread._id}):`, postsRes.status);
                postCounts[thread._id] = 0;
              }
            } catch (error) {
              console.error(`投稿数取得エラー (${thread._id}):`, error);
              postCounts[thread._id] = 0;
            }
          });
          
          // すべての投稿数を並列で取得
          await Promise.all(promises);
          setCounts(postCounts);
        }
      } catch (error) {
        console.error("スレッド取得エラー:", error);
      } finally {
        setIsLoadingThreads(false);
      }
    }
    
    fetchThreads();
  }, []);

  // ヘッドライン取得
  useEffect(() => {
    let isMounted = true; // コンポーネントのマウント状態を追跡

    async function fetchHeadlines() {
      try {
        const res = await fetch("/api/headlines");
        if (res.ok && isMounted) {
          const data = await res.json();
          
          console.log("=== フロントエンド ヘッドライン取得 ===");
          console.log("取得データ数:", data.length);
          if (data.length > 0) {
            console.log("最初のデータ:", JSON.stringify(data[0], null, 2));
          }
          
          setHeadlines(prevHeadlines => {
            // 新しいデータを投稿時刻でソート
            const sortedNewData = data.sort((a: any, b: any) => {
              const aTime = new Date(a.createdAt).getTime();
              const bTime = new Date(b.createdAt).getTime();
              return bTime - aTime;
            });

            // 既存のヘッドラインと新しいデータを比較（投稿IDで比較）
            const existingIds = new Set(prevHeadlines.map(h => h._id));
            
            // 新しい投稿を検出
            const newItems = sortedNewData.filter((h: any) => !existingIds.has(h._id));
            
            // アニメーション対象のアイテム
            const itemsToAnimate = [...newItems];
            
            if (itemsToAnimate.length > 0 && isMounted) {
              setNewHeadlines(itemsToAnimate);
              setIsUpdatingHeadlines(true);
              setHeadlinesVersion(prev => prev + 1);
              
              // アニメーション完了後に状態をリセット
              setTimeout(() => {
                if (isMounted) {
                  setIsUpdatingHeadlines(false);
                  setNewHeadlines([]);
                }
              }, 3000); // 3秒に延長
            }

            // すべての投稿を統合（重複を除去）
            const allHeadlines = sortedNewData.reduce((acc: any[], current: any) => {
              const existingIndex = acc.findIndex(item => item._id === current._id);
              if (existingIndex === -1) {
                acc.push(current);
              } else {
                // より新しい情報で更新
                acc[existingIndex] = current;
              }
              return acc;
            }, []);

            // 最終的に投稿時刻でソート
            return allHeadlines.sort((a: any, b: any) => {
              const aTime = new Date(a.createdAt).getTime();
              const bTime = new Date(b.createdAt).getTime();
              return bTime - aTime;
            });
          });
        }
      } catch (error) {
        console.error("ヘッドライン取得エラー:", error);
      } finally {
        if (isMounted) {
          setIsLoadingHeadlines(false);
        }
      }
    }
    
    fetchHeadlines();
    
    // リアルタイム更新の設定（5秒間隔）
    const interval = setInterval(fetchHeadlines, 5000);
    setHeadlineUpdateInterval(interval);
    
    // クリーンアップ
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // 検索フィルタリング
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredThreads(threads);
      setIsSearching(false);
    } else {
      const filtered = threads.filter(thread => 
        thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredThreads(filtered);
      setIsSearching(true);
    }
    setCurrentPage(1); // 検索時にページをリセット
  }, [searchQuery, threads]);

  // 検索実行関数
  const handleSearch = () => {
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
      // URLを更新
      const newUrl = `/home?q=${encodeURIComponent(searchInput.trim())}`;
      window.history.pushState({}, '', newUrl);
      // タイトルを更新
      document.title = `${searchInput.trim()} | 地雷掲`;
    }
  };

  // 検索クリア関数
  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    // URLから検索パラメータを削除
    window.history.pushState({}, '', '/home');
    // タイトルを元に戻す
    document.title = "地雷掲";
  };

  // スレッドの活性度を計算する関数
  const calculateActivityScore = (thread: Thread) => {
    const postCount = counts[thread._id] ?? 0;
    const createdAt = new Date(thread.createdAt).getTime();
    const now = Date.now();
    const ageInHours = (now - createdAt) / (1000 * 60 * 60);
    
    // 投稿頻度（1時間あたりの投稿数）
    const postFrequency = ageInHours > 0 ? postCount / ageInHours : postCount;
    
    // 最近の盛り上がり度（投稿数が多いほど高く、新しいスレッドほど高く）
    const recencyBonus = Math.max(0, 24 - ageInHours) / 24; // 24時間以内はボーナス
    const activityScore = postFrequency * 10 + recencyBonus * 5 + postCount;
    
    return activityScore;
  };

  // アクティブなスレッドを上に並び替え（投稿頻度と盛り上がり度を考慮）
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    const scoreA = calculateActivityScore(a);
    const scoreB = calculateActivityScore(b);
    return scoreB - scoreA; // 活性度が高い順
  });

  // ページネーション計算
  const totalPages = Math.ceil(sortedThreads.length / threadsPerPage);
  const startIndex = (currentPage - 1) * threadsPerPage;
  const endIndex = startIndex + threadsPerPage;
  const currentThreads = sortedThreads.slice(startIndex, endIndex);

  // ページ変更関数
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 検索結果のハイライト機能
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 px-1 rounded font-semibold inline-block">
          {part}
        </mark>
      ) : part
    );
  };

  // スレッド作成
  async function handleCreateThread() {
    router.push('/create-thread');
  }

  // 一番上に戻る関数
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // スレッド総数を計算
  const totalThreads = threads.length;
  const showThreadSwitch = totalThreads >= 70; // 70個以上の場合のみ表示

  return (
    <div className="min-h-screen">
      {/* トップ広告エリア */}
      <div className="w-full border-b-2 border-gray-300 py-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner type="wide" />
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex justify-center min-h-screen">
        {/* メインカラム */}
        <main className="flex-1 max-w-4xl mx-auto border-x border-zinc-200 min-h-screen" style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
        }}>
          {/* 携帯用ヘッダー（PCでは非表示） */}
          <div className="lg:hidden flex items-center justify-between p-6 border-b border-zinc-200" style={{
            background: '#fdf2f8'
          }}>
            <div className="flex items-center gap-3 -ml-4">
              <img src="/title.svg" alt="地雷掲" className="h-16" />
            </div>
            <div className="flex items-center gap-3">
              {isSearching ? (
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-sm border-none transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <i className="fas fa-home text-lg"></i>
                  <span>ホームに戻る</span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-sm border-none transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ec4899 100%)',
                    boxShadow: '0 0 5px #ff87b2, 0 4px 15px rgba(253, 242, 248, 0.3)',
                    border: '2px solid #ff87b2'
                  }}
                  onClick={() => router.push('/create-thread')}
                >
                  <i className="fas fa-plus text-lg"></i>
                  <span>スレッド作成</span>
                </button>
              )}
            </div>
          </div>

          {/* 携帯用検索フォーム（PCでは非表示） */}
          <div className="lg:hidden p-6 border-b border-zinc-200 bg-white">
            <div className="flex gap-2">
              <div className="relative flex-1">
                                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-primary">
                    <i className="fas fa-search"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="スレッドを検索..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-4 border-2 border-border-primary rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white shadow-lg hover:shadow-xl transition-all duration-300 text-text-primary placeholder-text-primary"
                  />
              </div>
      <button
                  onClick={handleSearch}
                  className="px-6 py-4 text-white rounded-full hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <i className="fas fa-search text-lg"></i>
      </button>

            </div>
          </div>

          {/* PC用ヘッダー（携帯では非表示） */}
          <div className="hidden lg:flex items-center justify-between p-8 border-b border-zinc-200" style={{
            background: '#fdf2f8'
          }}>
            <div className="flex items-center gap-4 -ml-6">
              <img src="/title.svg" alt="地雷掲" className="h-20" />
            </div>
            <div className="flex items-center gap-6">
              {/* PC用検索フォーム */}
              <div className="flex gap-2">
                <div className="relative">
                                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-primary">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  placeholder="スレッドを検索..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-80 pl-10 pr-4 py-3 border-2 border-border-primary rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white shadow-lg hover:shadow-xl transition-all duration-300 text-text-primary placeholder-text-primary"
                />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 text-white rounded-full hover:shadow-lg transition-all duration-300 font-bold flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <i className="fas fa-search text-lg"></i>
                </button>

              </div>
              {isSearching ? (
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-3 px-8 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-lg border-none transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <i className="fas fa-home text-xl"></i>
                  <span>ホーム</span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-3 px-8 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-lg border-none transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ec4899 100%)',
                    boxShadow: '0 0 5px #ff87b2, 0 4px 15px rgba(253, 242, 248, 0.3)',
                    border: '2px solid #ff87b2'
                  }}
                  onClick={() => router.push('/create-thread')}
                >
                  <i className="fas fa-plus text-xl"></i>
                  <span>スレ立て</span>
                </button>
              )}
            </div>
          </div>
          {/* スレッド作成フォーム */}
          {/* showForm state was removed, so this block is no longer needed */}
          
          {/* ヘッドラインセクション */}
          {!isSearching && (
            <div className="py-4 px-6" style={{
              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeadlines}
                      onChange={(e) => setShowHeadlines(e.target.checked)}
                      className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                    />
                    <h2 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                      <i className="fas fa-bolt text-yellow-500"></i>
                      <span>ヘッドライン</span>
                    </h2>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>リアルタイム更新中</span>
                </div>
              </div>
              
              {showHeadlines && (
                <>
                  {isLoadingHeadlines ? (
                    <div className="text-center text-zinc-400 py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-2"></div>
                      <p className="text-xs">ヘッドラインを読み込み中...</p>
                    </div>
                  ) : headlines.length === 0 ? (
                    <div className="text-center text-zinc-400 py-4">
                      <i className="fas fa-newspaper text-2xl mb-1 opacity-50"></i>
                      <p className="text-xs">まだヘッドラインがありません</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {/* 新しいヘッドライン（アニメーション付き） */}
                      {isUpdatingHeadlines && newHeadlines.map((headline, index) => {
                        return (
                          <div
                            key={`new-${headline._id}-${headlinesVersion}-${index}`}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-500 cursor-pointer p-2 animate-slideInFromTop"
                            style={{
                              background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ff87b2 100%)',
                              boxShadow: '0 4px 15px rgba(255, 135, 178, 0.4)',
                              border: '2px solid #ff87b2',
                              animationDelay: `${index * 100}ms`
                            }}
                            onClick={() => router.push(`/threads/${headline.threadId}`)}
                          >
                            <div className="bg-white bg-opacity-90 p-2 rounded-lg shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-pink-600 animate-pulse">NEW</span>
                                    <span className="text-xs font-bold text-red-600">+{headline.threadPostCount || 0}</span>
                                    <h3 className="text-xs font-bold text-gray-800 leading-tight flex-1 truncate">
                                      {headline.threadTitle || '無題のスレッド'}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                    {headline.content && headline.content.length > 0 
                                      ? (headline.content.length > 50 
                                          ? headline.content.substring(0, 50) + '...' 
                                          : headline.content)
                                      : '内容なし'
                                    }
                                  </p>
                                  {headline.author && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      by {headline.author}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex-shrink-0">
                                  <div className="text-xs text-gray-500">
                                    {(() => {
                                      const now = new Date();
                                      const postTime = new Date(headline.createdAt);
                                      const diffMs = now.getTime() - postTime.getTime();
                                      const diffSec = Math.floor(diffMs / 1000);
                                      const diffMin = Math.floor(diffSec / 60);
                                      const diffHour = Math.floor(diffMin / 60);
                                      const diffDay = Math.floor(diffHour / 24);
                                      
                                      if (diffSec < 60) return `${diffSec}秒前`;
                                      if (diffMin < 60) return `${diffMin}分前`;
                                      if (diffHour < 24) return `${diffHour}時間前`;
                                      if (diffDay < 7) return `${diffDay}日前`;
                                      return postTime.toLocaleDateString();
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* 既存のヘッドライン */}
                      {headlines.map((headline, index) => (
                        <div
                          key={`${headline._id}-${headlinesVersion}-${index}`}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer p-2 animate-fadeIn hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ff87b2 100%)',
                            boxShadow: '0 4px 15px rgba(255, 135, 178, 0.4)',
                            border: '2px solid #ff87b2'
                          }}
                          onClick={() => router.push(`/threads/${headline.threadId}`)}
                        >
                          <div className="bg-white bg-opacity-90 p-2 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                              {/* 左側：スレッドタイトルと投稿内容 */}
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-red-600">+{headline.threadPostCount || 0}</span>
                                  <h3 className="text-xs font-bold text-gray-800 leading-tight flex-1 truncate">
                                    {headline.threadTitle || '無題のスレッド'}
                                  </h3>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                  {headline.content && headline.content.length > 0 
                                    ? (headline.content.length > 50 
                                        ? headline.content.substring(0, 50) + '...' 
                                        : headline.content)
                                    : '内容なし'
                                  }
                                </p>
                                {headline.author && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    by {headline.author}
                                  </p>
                                )}
                              </div>
                              
                              {/* 右側：タイムスタンプ */}
                              <div className="flex-shrink-0">
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const now = new Date();
                                    const postTime = new Date(headline.createdAt);
                                    const diffMs = now.getTime() - postTime.getTime();
                                    const diffSec = Math.floor(diffMs / 1000);
                                    const diffMin = Math.floor(diffSec / 60);
                                    const diffHour = Math.floor(diffMin / 60);
                                    const diffDay = Math.floor(diffHour / 24);
                                    
                                    if (diffSec < 60) return `${diffSec}秒前`;
                                    if (diffMin < 60) return `${diffMin}分前`;
                                    if (diffHour < 24) return `${diffHour}時間前`;
                                    if (diffDay < 7) return `${diffDay}日前`;
                                    return postTime.toLocaleDateString();
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* スレッド一覧 */}
          <div className="py-8 px-6" style={{
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
          }}>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {isSearching ? `検索結果: "${searchQuery}"` : "スレッド一覧"}
              </h1>
              {isSearching && (
                <p className="text-sm text-text-primary mt-2">
                  検索結果: {filteredThreads.length}件
                </p>
              )}
            </div>
            {isLoadingThreads ? (
              <div className="text-center text-zinc-400 py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-lg">スレッドを読み込み中...</p>
              </div>
            ) : currentThreads.length === 0 ? (
              <div className="text-center text-zinc-400 py-12">
                <i className="fas fa-comments text-6xl mb-4 opacity-50"></i>
                {isSearching ? (
                  <>
                    <p className="text-lg">検索結果が見つかりません</p>
                    <p className="text-sm mt-2">「{searchQuery}」に一致するスレッドがありません</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">まだスレッドがありません</p>
                    <p className="text-sm mt-2">最初のスレッドを作成してみましょう！</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentThreads.map(thread => (
                  <div
                    key={thread._id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer p-4 animate-fadeIn hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #f9a8d4 0%, #fce7f3 50%, #f9a8d4 100%)',
                      boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)',
                      border: '1px solid #f9a8d4'
                    }}
                    onClick={() => router.push(`/threads/${thread.threadId || thread._id}`)}
                  >
                    <div className="bg-white bg-opacity-80 p-4 rounded-lg shadow-sm">
                      <div className="flex items-start justify-between">
                        {/* 左側：タイトルと説明 */}
                        <div className="flex-1 min-w-0 mr-4 lg:mr-6">
                          <div className="flex items-start gap-3 mb-2">
                            <h3 className="text-sm lg:text-base font-bold text-text-primary leading-tight flex-1">
                              {highlightText(thread.title, searchQuery)}
                            </h3>
                            {/* 活性度インジケーター */}
                            {calculateActivityScore(thread) > 5 && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></div>
                                <span className="text-xs text-red-600 font-bold">HOT</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs lg:text-sm text-text-primary leading-relaxed line-clamp-2">
                            {highlightText(thread.description, searchQuery)}
                          </p>
                        </div>
                        
                        {/* 右側：メタデータバッジ（縦に並べる） */}
                        <div className="flex flex-col items-end gap-1.5 lg:gap-2 flex-shrink-0">
                          {/* 日付バッジ */}
                          <div className="flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                              boxShadow: '0 1px 3px rgba(253, 242, 248, 0.3)'
                            }}>
                            <i className="fas fa-calendar text-gray-700 text-xs"></i>
                            <span className="text-xs font-bold text-gray-700">{new Date(thread.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          {/* 時間バッジ */}
                          <div className="flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                              boxShadow: '0 1px 3px rgba(253, 242, 248, 0.3)'
                            }}>
                            <i className="fas fa-clock text-gray-700 text-xs"></i>
                            <span className="text-xs font-bold text-gray-700">{new Date(thread.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* ページネーション */}
            {!isLoadingThreads && totalPages > 1 && (
              <div className="mt-8 text-center">
                <div className="text-sm text-text-primary mb-6 font-medium">
                  現在のページ: {currentPage} / {totalPages}
                </div>
                
                {/* スレッド切り替えボタンと一番上に戻るボタン */}
                <div className="flex justify-center gap-3 mb-4">
                  {/* スレッド切り替えボタン（70個以上の場合のみ表示） */}
                  {showThreadSwitch && (
                    <button
                      onClick={() => {
                        // スレッドをシャッフルして表示順序を変更
                        const shuffledThreads = [...threads].sort(() => Math.random() - 0.5);
                        setThreads(shuffledThreads);
                        setCurrentPage(1);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ff87b2 100%)',
                        boxShadow: '0 4px 15px rgba(255, 135, 178, 0.4)',
                        border: '2px solid #ff87b2'
                      }}
                    >
                      <i className="fas fa-random text-xs"></i>
                      <span>スレッド切り替え</span>
                    </button>
                  )}
                  
                  {/* 一番上に戻るボタン */}
                  <button
                    onClick={scrollToTop}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #ff87b2 0%, #f9a8d4 50%, #ff87b2 100%)',
                      boxShadow: '0 4px 15px rgba(255, 135, 178, 0.4)',
                      border: '2px solid #ff87b2'
                    }}
                  >
                    <i className="fas fa-chevron-up text-xs"></i>
                    <span>一番上に戻る</span>
                  </button>
                </div>
                
                <div className="flex justify-center gap-3">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-full shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
                    style={{
                      background: currentPage <= 1 ? 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 50%, #ffb6c1 100%)' : 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 50%, #ffb6c1 100%)',
                      boxShadow: currentPage <= 1 ? '0 4px 12px rgba(255, 182, 193, 0.3)' : '0 4px 15px rgba(255, 182, 193, 0.4)',
                      border: '2px solid #ffb6c1'
                    }}
                  >
                    <div className="ribbon-icon">
                      <i className="fas fa-chevron-left text-xs text-white"></i>
                    </div>
                    <span>前へ</span>
                  </button>
                  
                  <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border-2 border-pink-200">
                    <span className="text-lg font-bold text-pink-600">{currentPage}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-lg font-bold text-pink-600">{totalPages}</span>
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-full shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
                    style={{
                      background: currentPage >= totalPages ? 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 50%, #ffb6c1 100%)' : 'linear-gradient(135deg, #ffb6c1 0%, #ffc0cb 50%, #ffb6c1 100%)',
                      boxShadow: currentPage >= totalPages ? '0 4px 12px rgba(255, 182, 193, 0.3)' : '0 4px 15px rgba(255, 182, 193, 0.4)',
                      border: '2px solid #ffb6c1'
                    }}
                  >
                    <span>次へ</span>
                    <div className="ribbon-icon">
                      <i className="fas fa-chevron-right text-xs text-white"></i>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 最下層広告エリア */}
      <div className="w-full bg-white border-t-2 border-gray-300 py-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner type="wide" />
        </div>
      </div>
    </div>
  );
}
