"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";
import { Thread, Post } from "@/app/types/global";
import AdBanner from "@/components/AdBanner";
import DOMPurify from "dompurify";

// お絵描き機能のコンポーネント
const DrawingModal = ({ isOpen, onClose, onSave }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (imageData: string) => void; 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'brush' | 'fill'>('pen');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      }
    }
  }, [isOpen]);

  const saveToHistory = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL();
      setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? 'white' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveToHistory();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      saveToHistory();
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && history[historyIndex - 1]) {
        const img = new window.Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex - 1];
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && history[historyIndex + 1]) {
        const img = new window.Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas!.width, canvas!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex + 1];
      }
    }
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL();
      onSave(imageData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="rounded-lg shadow-xl max-w-4xl w-full mx-4" style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%)'
      }}>
        {/* タイトルバー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <i className="fas fa-pencil-alt text-blue-600"></i>
            <h2 className="text-lg font-bold">お絵描き機能</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* コントロールパネル */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">色/背景:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">太:</span>
              <select
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </div>
          </div>

          {/* ツールバー */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="鉛筆"
            >
              <i className="fas fa-pencil-alt"></i>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="消しゴム"
            >
              <i className="fas fa-eraser"></i>
            </button>
            <button
              onClick={() => setTool('brush')}
              className={`p-2 rounded ${tool === 'brush' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="筆"
            >
              <i className="fas fa-paint-brush"></i>
            </button>
            <button
              onClick={() => setTool('fill')}
              className={`p-2 rounded ${tool === 'fill' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="塗りつぶし"
            >
              <i className="fas fa-fill-drip"></i>
            </button>
            <button
              onClick={clearCanvas}
              className="p-2 rounded text-gray-600 hover:bg-gray-100"
              title="クリア"
            >
              <i className="fas fa-trash"></i>
            </button>
            <button
              onClick={() => {}} // 画像アップロード機能（後で実装）
              className="p-2 rounded text-gray-600 hover:bg-gray-100"
              title="画像"
            >
              <i className="fas fa-image"></i>
            </button>
          </div>
        </div>

        {/* キャンバス */}
        <div className="p-4 flex justify-center">
          <div className="border-2 border-gray-300 bg-gray-100 p-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="bg-white cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-undo"></i>
              <span>戻</span>
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-redo"></i>
              <span>進</span>
            </button>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-paper-plane text-xl"></i>
            <span>投稿</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 投稿フォームコンポーネント（メモ化）
const FormContent = React.memo((props: {
  showPollModal: boolean;
  setShowPollModal: (v: boolean) => void;
  pollTitle: string;
  setPollTitle: (v: string) => void;
  pollOptions: string[];
  setPollOptions: (v: string[]) => void;
  pollDeadline: string;
  setPollDeadline: (v: string) => void;
  handleAddOption: () => void;
  handleRemoveOption: (idx: number) => void;
  handleOptionChange: (idx: number, value: string) => void;
  handlePollSubmit: () => void;
  content: string;
  setContent: (v: string) => void;
  setShowDrawingModal: (v: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handlePost: () => void;
  loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="rounded-xl border-2 border-pink-200 p-6 shadow-2xl" style={{
    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
    boxShadow: '0 20px 25px -5px rgba(253, 242, 248, 0.3), 0 10px 10px -5px rgba(253, 242, 248, 0.2)'
  }}>
    {/* 隠しファイル入力 */}
    <input
      type="file"
      ref={props.fileInputRef}
      onChange={props.handleImageUpload}
      accept="image/*"
      multiple
      className="hidden"
    />
    <textarea
      ref={props.textareaRef}
      className="w-full resize-none text-base px-5 py-4 mb-4 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 bg-white shadow-lg transition-all duration-300"
      rows={3}
      placeholder="投稿内容をかいてﾈ"
      value={props.content}
      onChange={(e) => props.setContent(e.target.value)}
      maxLength={300}
      style={{
        background: 'rgba(255, 255, 255, 1)',
        boxShadow: '0 4px 6px -1px rgba(253, 242, 248, 0.3), 0 2px 4px -1px rgba(253, 242, 248, 0.2)'
      }}
    />
    <div className="flex items-center justify-between mb-3">
      <div className="flex-1"></div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => props.fileInputRef?.current?.click()}
          className="w-12 h-12 flex items-center justify-center rounded-full border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          title="画像をアップロード"
          style={{ 
            boxShadow: '0 4px 12px rgba(253, 242, 248, 0.3)',
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
            borderColor: '#f9a8d4'
          }}
        >
          <i className="fas fa-image text-xl text-pink-600"></i>
        </button>
        <button
          onClick={() => props.setShowDrawingModal(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          title="お絵描き"
          style={{ 
            boxShadow: '0 4px 12px rgba(253, 242, 248, 0.3)',
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
            borderColor: '#f9a8d4'
          }}
        >
          <i className="fas fa-pen text-xl text-pink-600"></i>
        </button>
        <button
          onClick={() => props.setShowPollModal(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full border-2 hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          title="アンケート作成"
          style={{ 
            boxShadow: '0 4px 12px rgba(253, 242, 248, 0.3)',
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
            borderColor: '#f9a8d4'
          }}
        >
          <i className="fas fa-poll text-xl text-pink-600"></i>
        </button>
      </div>
    </div>
    <div className="flex justify-between items-end mb-4">
      <div className="flex-1"></div>
      <div className="text-sm text-pink-600 font-medium select-none pr-2 bg-white/70 px-3 py-1 rounded-full shadow-sm" style={{fontFamily:'monospace', textAlign:'right'}}>
        {props.content.length}/300文字
      </div>
    </div>
    <div className="flex justify-end">
      <button
        className="text-lg px-8 py-4 font-bold rounded-full shadow-2xl text-white flex items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-3xl transform active:scale-95"
        onClick={props.handlePost}
        disabled={props.loading || !props.content.trim()}
        style={{ 
          minWidth: '160px', 
          letterSpacing: '0.05em', 
          fontSize: '1.2rem',
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
          boxShadow: '0 10px 25px -5px rgba(253, 242, 248, 0.4), 0 4px 6px -1px rgba(253, 242, 248, 0.3)'
        }}
      >
        <i className="fas fa-paper-plane text-xl text-pink-600"></i>
        <span className="text-pink-600">投稿</span>
      </button>
    </div>
    {props.showPollModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-2xl shadow-2xl p-7 w-80 relative border-2 border-pink-200" style={{background:'linear-gradient(135deg,#fff 60%,#fdf2f8 100%)'}}>
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-lg text-pink-600 flex items-center gap-2">
              <i className="fas fa-poll"></i>アンケートを作る
            </div>
            <button onClick={() => props.setShowPollModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <input
            className="w-full border rounded px-2 py-1 mb-2 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            placeholder="タイトル（空欄可）"
            value={props.pollTitle}
            onChange={e => props.setPollTitle(e.target.value)}
          />
          {props.pollOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center mb-1">
              <input
                className="flex-1 border rounded px-2 py-1 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                placeholder={`回答${idx + 1}`}
                value={opt}
                onChange={e => props.handleOptionChange(idx, e.target.value)}
              />
              {props.pollOptions.length > 2 && (
                <button onClick={() => props.handleRemoveOption(idx)} className="ml-1 text-red-400 hover:text-red-600 text-lg">−</button>
              )}
              {idx === props.pollOptions.length - 1 && (
                <button onClick={props.handleAddOption} className="ml-1 text-pink-400 hover:text-pink-600 text-lg">＋</button>
              )}
            </div>
          ))}
          <div className="mt-2 mb-2">
            <select
              className="w-full border rounded px-2 py-1 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              value={props.pollDeadline}
              onChange={e => props.setPollDeadline(e.target.value)}
            >
              <option value="3分">3分</option>
              <option value="5分">5分</option>
              <option value="10分">10分</option>
              <option value="30分">30分</option>
              <option value="1時間">1時間</option>
              <option value="1日">1日</option>
            </select>
          </div>
          <button
            className="text-white w-full py-2 rounded-full mt-2 font-bold shadow transition-all"
            onClick={props.handlePollSubmit}
            disabled={props.pollOptions.some(opt => !opt.trim())}
            style={{
              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)'
            }}
          >
            <span className="text-pink-600">おｋ</span>
          </button>
        </div>
      </div>
    )}
  </div>
));

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFetchedAllPosts, setHasFetchedAllPosts] = useState(false);
  const [originalPosts, setOriginalPosts] = useState<Post[]>([]); // 取得前の投稿を保存
  const [lastSeenPostId, setLastSeenPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [nestedPosts, setNestedPosts] = useState<Post[]>([]);
  const [showNestedModals, setShowNestedModals] = useState<boolean[]>([]);
  const [mainPosts, setMainPosts] = useState<Post[]>([]);
  const [showMainModals, setShowMainModals] = useState<boolean[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(""); // 現在の検索クエリを保存
  const [isFormFixed, setIsFormFixed] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fixedFileInputRef = useRef<HTMLInputElement>(null); // Added for fixed form image upload
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Added for textarea focus management
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // 追加: bottom値を管理するstate
  const [formBottom, setFormBottom] = useState(16); // px単位、初期値16px (bottom-4)

  // DOMPurifyを使用した強力なHTMLサニタイズ関数
  const sanitizeHTML = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['img', 'br', 'p', 'div', 'span'],
      ALLOWED_ATTR: ['src', 'alt', 'style', 'crossorigin'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'meta', 'style', 'title', 'head', 'body', 'html', 'frame', 'frameset', 'noframes', 'applet', 'base', 'basefont', 'bgsound', 'isindex', 'keygen', 'listing', 'plaintext', 'xmp'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange', 'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'onresize', 'onstorage', 'oncontextmenu', 'oninput', 'oninvalid', 'onsearch'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      ADD_TAGS: [],
      ADD_ATTR: ['crossorigin'],
      USE_PROFILES: { html: true }
    });
  };

  // 投稿フォームの元の位置を参照するrefを追加
  const formOriginRef = useRef<HTMLDivElement>(null);

  // 投稿フォーム本体のref
  const formRef = useRef<HTMLDivElement>(null);

  // アンケート用のstate
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDeadline, setPollDeadline] = useState("3分");
  
  // ポーリングシステム用のstate
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastAcquiredPostNumber, setLastAcquiredPostNumber] = useState<number>(0);
  const [postIds, setPostIds] = useState<Set<string>>(new Set()); // 投稿IDの重複チェック用
  const [isCheckingNewPosts, setIsCheckingNewPosts] = useState(false); // 重複実行防止用

  const handleAddOption = () => setPollOptions([...pollOptions, ""]);
  const handleRemoveOption = (idx: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };
  const handleOptionChange = (idx: number, value: string) => {
    setPollOptions(pollOptions.map((opt, i) => (i === idx ? value : opt)));
  };
  const handlePollSubmit = () => {
    setShowPollModal(false);
    setPollTitle("");
    setPollOptions(["", ""]);
    setPollDeadline("3分");
    alert("アンケートを投稿しました（ダミー）");
  };

  // URLから投稿番号を取得する関数
  const getPostNumberFromUrl = () => {
    const pathSegments = window.location.pathname.split('/');
    const postIndex = pathSegments.indexOf('post');
    if (postIndex !== -1 && postIndex + 1 < pathSegments.length) {
      const postNumber = parseInt(pathSegments[postIndex + 1]);
      return isNaN(postNumber) ? null : postNumber;
    }
    return null; // デフォルトは最新投稿
  };

  // ブラウザの戻る/進むボタンに対応
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log("ブラウザナビゲーション検出");
      const urlPostNumber = getPostNumberFromUrl();
      console.log(`新しい投稿番号: ${urlPostNumber}`);
      
      if (urlPostNumber !== null) {
        // 投稿番号が指定されている場合はその投稿を含むページを取得
        searchPostByNumber(urlPostNumber).then((post) => {
          if (post) {
            const targetPage = Math.ceil(post.postNumber / 40);
            setCurrentPage(targetPage);
            fetchPosts(targetPage);
          } else {
            // 投稿が見つからない場合は最新ページを取得
            goToLatestPage();
          }
        });
      } else {
        // 投稿番号が指定されていない場合は最新ページを取得
        goToLatestPage();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);

  // スレッド情報を取得
  useEffect(() => {
    async function fetchThread() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/threads/${params.id}`);
        if (res.ok) {
          const threadData = await res.json();
          setThread(threadData);
        }
      } catch (error) {
        console.error("スレッド取得エラー:", error);
      }
    }
    fetchThread();
  }, [params.id]);

  // SSE接続のref
  const eventSourceRef = useRef<EventSource | null>(null);

  // 投稿を取得（高速初期ロード + SSE）
  useEffect(() => {
    if (!params.id) return;

    // 既存のSSE接続を閉じる
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // 初期ロード時は即座にAPIでデータを取得
    if (isInitialLoad) {
      console.log("初期ロード: 即座にAPIでデータを取得");
      setIsInitialLoad(false);
      setIsLoading(true);
      
      // URLから投稿番号を取得
      const urlPostNumber = getPostNumberFromUrl();
      console.log(`URLから取得した投稿番号: ${urlPostNumber}`);
      
              if (!urlPostNumber) {
          // 投稿番号が指定されていない場合は最新の15個の投稿を取得
          console.log("投稿番号が指定されていないため、最新の15個の投稿を取得します");
          // 状態をリセットしてから取得
          resetPostsState();
          fetchLatestPosts().then(() => {
            console.log("初期データ取得完了（最新の15個の投稿）");
            setIsLoading(false);
            startPolling();
          }).catch((error: any) => {
            console.error("初期データ取得エラー:", error);
            setIsLoading(false);
            startPolling();
          });
        } else {
        // 特定の投稿番号が指定されている場合はその投稿を含むページを取得
        console.log(`投稿番号${urlPostNumber}が指定されているため、その投稿を含むページを取得します`);
        searchPostByNumber(urlPostNumber).then((post) => {
          if (post) {
            // 投稿が見つかった場合、その投稿を含むページを計算して取得
            const targetPage = Math.ceil(post.postNumber / 15); // 15個ずつに修正
            fetchPosts(targetPage).then(() => {
              console.log(`初期データ取得完了（投稿番号${urlPostNumber}を含む${targetPage}ページ目）`);
              setIsLoading(false);
              startPolling();
            });
          } else {
            // 投稿が見つからない場合は最新ページを取得
            console.log("投稿が見つからないため最新ページを取得");
            goToLatestPage().then(() => {
              console.log("投稿が見つからないため最新ページを取得");
              setIsLoading(false);
              startPolling();
            });
          }
        }).catch((error: any) => {
          console.error("初期データ取得エラー:", error);
          setIsLoading(false);
          startPolling();
        });
      }
    } else {
      // 通常の更新時はポーリングを開始
      console.log("通常更新: ポーリングを開始");
      startPolling();
    }

    // SSE接続を開始する関数
    function startSSEConnection() {
      // 全投稿を取得済みの場合はSSE接続を開始しない
      if (hasFetchedAllPosts) {
        console.log("全投稿を取得済みのため、SSE接続を開始しません");
        return;
      }
      
      // 既存の接続を閉じる
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // SSE接続は最新投稿の監視のみ（ページネーションとは完全に独立）
      const eventSource = new EventSource(`/api/posts/sse?threadId=${params.id}&page=1&limit=40`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("SSE接続が確立されました");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'update') {
            console.log("SSE更新を受信:", data);
            const receivedPosts = data.posts || [];
            console.log("受信した投稿数:", receivedPosts.length);
            
            // ページネーション情報を更新
            if (data.pagination) {
              setTotalPages(data.pagination.totalPages);
              setTotalPosts(data.pagination.totalPosts);
            }
            
            // SSEで新しい投稿を監視
            console.log(`SSE更新: 現在のページ=${currentPage}, 最新ページ=${data.pagination?.totalPages || 1}`);
            
            // 新しい投稿を検出して追加表示
            if (receivedPosts.length > 0) {
              console.log(`SSE受信: ${receivedPosts.length}件の投稿を受信`);
              
              if (posts.length > 0) {
                // 既存の投稿と新しい投稿を比較
                const currentLatestPostNumber = Math.max(...posts.map((p: Post) => p.postNumber || 0));
                const receivedLatestPostNumber = Math.max(...receivedPosts.map((p: Post) => p.postNumber || 0));
                
                console.log(`現在の最新投稿番号: ${currentLatestPostNumber}, 受信した最新投稿番号: ${receivedLatestPostNumber}`);
                
                if (receivedLatestPostNumber > currentLatestPostNumber) {
                  console.log("新しい投稿を検出しました");
                  
                  // 新しい投稿を特定
                  const actualNewPosts = receivedPosts.filter((p: Post) => (p.postNumber || 0) > currentLatestPostNumber);
                  
                  if (actualNewPosts.length > 0) {
                    console.log(`新しい投稿数: ${actualNewPosts.length}`);
                    console.log(`新しい投稿の投稿番号: ${actualNewPosts.map((p: Post) => p.postNumber).join(', ')}`);
                    
                    // 全投稿を取得済みの場合は新しい投稿を追加しない
                    if (hasFetchedAllPosts) {
                      console.log("全投稿を取得済みのため、新しい投稿の追加を停止します");
                      return;
                    }
                    
                    // 最新ページにいる場合は投稿リストに追加
                    const latestPage = data.pagination?.totalPages || 1;
                    if (currentPage === latestPage) {
                      console.log("最新ページなので、新しい投稿を追加表示します");
                      // 新しい投稿を既存の投稿に追加してソート
                      setPosts(prev => {
                        const updatedPosts = [...prev, ...actualNewPosts].sort((a, b) => (a.postNumber || 0) - (b.postNumber || 0));
                        console.log(`更新後の投稿数: ${updatedPosts.length}`);
                        return updatedPosts;
                      });
                    } else {
                      // 最新ページ以外にいる場合は新しい投稿を通知
                      console.log(`現在のページ(${currentPage})は最新ページ(${latestPage})ではないため、新しい投稿を通知します`);
                      setNewPosts(prev => [...actualNewPosts, ...prev]);
                    }
                  }
                } else {
                  console.log("新しい投稿はありません");
                }
              } else {
                // 初回ロード時は投稿リストを更新
                console.log("初回ロードなので、投稿リストを更新します");
                setPosts(receivedPosts);
              }
            }
          } else if (data.type === 'error') {
            console.error("SSEエラー:", data.message);
          }
        } catch (error) {
          console.error("SSEデータ解析エラー:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE接続エラー:", error);
        
        // 接続が閉じられた場合の処理
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("SSE接続が閉じられました");
          // 全投稿を取得済みでない場合のみ再接続を試行
          if (!hasFetchedAllPosts) {
            setTimeout(() => {
              if (!document.hidden) {
                console.log("SSE接続を再試行します");
                startSSEConnection();
              }
            }, 5000);
          } else {
            console.log("全投稿を取得済みのため、SSE接続を再試行しません");
          }
        } else {
          // その他のエラー時は従来のAPIにフォールバック
          fetchPosts(currentPage);
        }
      };

      // ページが非表示になった時の処理（APIコール削減のため簡素化）
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log("ページが非表示になったため、ポーリングを停止します");
          stopPolling();
        } else {
          // 全投稿を取得済みの場合はポーリングを再開しない
          if (!hasFetchedAllPosts) {
            console.log("ページが表示されたため、ポーリングを再開します");
            startPolling();
          } else {
            console.log("全投稿を取得済みのため、ポーリングを再開しません");
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // クリーンアップ関数を返す
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // クリーンアップ
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      // ポーリングを停止
      stopPolling();
    };
  }, [params.id, isInitialLoad]);

  // 最新の15個の投稿を取得する関数
  const fetchLatestPosts = async () => {
    if (!params.id) return;
    try {
      console.log(`最新の15個の投稿を取得中: threadId=${params.id}`);
      
      // まずデータベースの最新投稿番号を確認
      const dbLatestPostNumber = await getLatestPostNumberFromDB();
      console.log(`DB最新投稿番号: ${dbLatestPostNumber}`);
      
      // 最新の15個の投稿を取得（最後の15個）
      const startPostNumber = Math.max(1, dbLatestPostNumber - 14);
      const res = await fetch(`/api/posts?threadId=${params.id}&pre=${startPostNumber - 1}&now=${dbLatestPostNumber}&limit=15`);
      
      if (res.ok) {
        const data = await res.json();
        const postsArray = Array.isArray(data.posts) ? data.posts : [];
        console.log("取得した投稿数:", postsArray.length);
        console.log("取得した投稿番号:", postsArray.map((p: Post) => p.postNumber).join(', '));
        console.log("取得した投稿:", postsArray);
        
        // 重複を除去してから設定
        const uniquePosts = getUniquePosts(postsArray);
        setPosts(uniquePosts);
        
        // 最新の投稿番号を保存（DBの最新投稿番号を使用）
        setLastAcquiredPostNumber(dbLatestPostNumber);
        
        // ページネーション情報を設定（最新の15個の投稿を表示する場合は適切に設定）
        const totalPosts = data.pagination?.totalPosts || uniquePosts.length;
        // 初期状態では最新の15個を表示するので、全投稿数から計算
        const totalPages = Math.ceil(totalPosts / 15); // 15個ずつでページ数を計算
        setCurrentPage(totalPages); // 最新ページを現在のページとして設定
        setTotalPages(totalPages);
        setTotalPosts(totalPosts);
      } else {
        console.error("最新投稿の取得に失敗");
      }
    } catch (error) {
      console.error("最新投稿取得エラー:", error);
    }
  };

  // データベースの最新投稿番号を取得する関数（キャッシュ付き）
  const getLatestPostNumberFromDB = async () => {
    try {
      // キャッシュをチェック（1秒以内の同じリクエストはキャッシュを使用）
      const cacheKey = `latest_${params.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      const now = Date.now();
      
      if (cached) {
        const { timestamp, value } = JSON.parse(cached);
        if (now - timestamp < 1000) { // 1秒以内ならキャッシュを使用
          return value;
        }
      }
      
      const response = await fetch(`/api/posts?threadId=${params.id}&page=1&limit=1&getLatestOnly=true`);
      if (!response.ok) {
        throw new Error('最新投稿番号の取得に失敗しました');
      }
      const data = await response.json();
      const latestNumber = data.latestPostNumber || 0;
      
      // キャッシュに保存
      sessionStorage.setItem(cacheKey, JSON.stringify({
        timestamp: now,
        value: latestNumber
      }));
      
      return latestNumber;
    } catch (error) {
      console.error('最新投稿番号取得エラー:', error);
      return 0;
    }
  };

  // 軽量な新しい投稿チェック関数（重複防止）
  const checkForNewPosts = async () => {
    if (hasFetchedAllPosts) return; // 全投稿取得済みの場合はチェックしない
    
    // 既にチェック中の場合は重複実行を防ぐ
    if (isCheckingNewPosts) {
      console.log('既にチェック中のため、重複実行をスキップ');
      return;
    }
    
    setIsCheckingNewPosts(true);
    
    try {
      // データベースの最新投稿番号のみを取得（軽量）
      const dbLatestPostNumber = await getLatestPostNumberFromDB();
      
      // 差分がある場合のみ新しい投稿を取得
      if (dbLatestPostNumber > lastAcquiredPostNumber) {
        const newPostCount = dbLatestPostNumber - lastAcquiredPostNumber;
        console.log(`新しい投稿を検出: ${newPostCount}件 (${lastAcquiredPostNumber + 1} ～ ${dbLatestPostNumber})`);
        
        // 新しい投稿のみを取得（差分のみ）
        const response = await fetch(`/api/posts?threadId=${params.id}&pre=${lastAcquiredPostNumber}&now=${dbLatestPostNumber}&limit=${newPostCount}`);
        if (!response.ok) {
          throw new Error('新しい投稿の取得に失敗しました');
        }
        const data = await response.json();
        
        if (data.posts && data.posts.length > 0) {
          console.log(`新しい投稿を静かに追加: ${data.posts.length}件`);
          
          // 新しい投稿を静かに追加（アニメーションなし）
          setPosts(prevPosts => {
            const combinedPosts = [...prevPosts, ...data.posts];
            return combinedPosts.sort((a, b) => (a.postNumber || 0) - (b.postNumber || 0));
          });
          
          // 最新の投稿番号を更新
          setLastAcquiredPostNumber(dbLatestPostNumber);
          
          // 投稿数とページ数を静かに更新
          setTotalPosts(prev => prev + data.posts.length);
          setTotalPages(Math.ceil((totalPosts + data.posts.length) / 15));
          
          // 新しい投稿の通知（1秒でクリア、目立たない表示）
          setNewPosts(data.posts);
          setTimeout(() => setNewPosts([]), 1000);
        }
      }
    } catch (error) {
      console.error('新しい投稿チェックエラー:', error);
    } finally {
      setIsCheckingNewPosts(false);
    }
  };

  // ポーリングを開始する関数（重複防止）
  const startPolling = () => {
    // 既存のポーリングを停止
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // 重複チェック中フラグをリセット
    setIsCheckingNewPosts(false);
    
    const interval = setInterval(() => {
      checkForNewPosts();
    }, 8000); // 8秒ごとにチェック（静かな更新）
    
    setPollingInterval(interval);
    console.log('ポーリングを開始しました');
  };

  // 投稿を安全に追加する関数
  const addPostsSafely = (newPosts: Post[]) => {
    setPosts(prevPosts => {
      const existingIds = new Set(prevPosts.map(p => p._id));
      const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post._id));
      
      if (uniqueNewPosts.length === 0) {
        console.log('重複する投稿がないため、追加しません');
        return prevPosts;
      }
      
      console.log(`${uniqueNewPosts.length}件の新しい投稿を追加`);
      const combinedPosts = [...prevPosts, ...uniqueNewPosts];
      return combinedPosts.sort((a, b) => (a.postNumber || 0) - (b.postNumber || 0));
    });
  };

  // 投稿を一意に保つ関数
  const getUniquePosts = (posts: Post[]) => {
    const seen = new Set();
    const seenPostNumbers = new Set();
    return posts.filter(post => {
      const duplicateId = seen.has(post._id);
      const duplicateNumber = seenPostNumbers.has(post.postNumber);
      seen.add(post._id);
      seenPostNumbers.add(post.postNumber);
      return !duplicateId && !duplicateNumber;
    });
  };

  // 投稿の状態をリセットする関数
  const resetPostsState = () => {
    setPosts([]);
    setNewPosts([]);
    setOriginalPosts([]);
    setHasFetchedAllPosts(false);
    setLastAcquiredPostNumber(0);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalPosts(0);
  };

  // ポーリングを停止する関数
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // すべての投稿を取得する関数（前のレスを取得ボタン用）
  const fetchAllPosts = async () => {
    if (!params.id) return;
    try {
      setIsLoadingMore(true);
      console.log(`すべての投稿を取得中: threadId=${params.id}`);
      
      // 取得前の投稿を保存
      setOriginalPosts(posts);
      
      // 取得前の一番古い投稿番号を取得
      const oldestPostNumber = posts.length > 0 ? Math.min(...posts.map(p => p.postNumber || 0)) : 0;
      
      const res = await fetch(`/api/posts?threadId=${params.id}&page=1&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        const postsArray = Array.isArray(data.posts) ? data.posts : [];
        console.log("取得した投稿数:", postsArray.length);
        console.log("取得した投稿番号:", postsArray.map((p: Post) => p.postNumber).join(', '));
        console.log("取得した投稿:", postsArray);
        
        // 全投稿を取得するが、現在のページ位置は変更しない（スクロール位置も保持）
        setPosts(postsArray);
        // 全投稿を取得した場合は、ページネーション情報は変更しない
        // 全投稿を取得した後はページネーションは表示されないため
        // setCurrentPage(1); // 現在のページ位置は変更しない
        
        // ボタンが押されたことを記録
        setHasFetchedAllPosts(true);
        
        // 全投稿を取得した後はポーリングを停止
        console.log("全投稿を取得したため、ポーリングを停止します");
        stopPolling();
        
        // 取得前の一番古い投稿の場所にスクロール
        setTimeout(() => {
          const oldestPostElement = document.querySelector(`[data-post-number="${oldestPostNumber}"]`);
          if (oldestPostElement) {
            oldestPostElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100); // 少し遅延を入れてDOMの更新を待つ
      } else {
        console.error("すべての投稿の取得に失敗");
      }
    } catch (error) {
      console.error("すべての投稿取得エラー:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 投稿番号範囲で投稿を取得する関数
  const fetchPostsByRange = async (startPostNumber: number, limit: number) => {
    if (!params.id) return;
    try {
      console.log(`投稿番号範囲で取得中: threadId=${params.id}, start=${startPostNumber}, limit=${limit}`);
      const res = await fetch(`/api/posts?threadId=${params.id}&startPostNumber=${startPostNumber}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        const postsArray = Array.isArray(data.posts) ? data.posts : [];
        console.log("取得した投稿数:", postsArray.length);
        console.log("取得した投稿番号:", postsArray.map((p: Post) => p.postNumber).join(', '));
        console.log("取得した投稿:", postsArray);
        
        // 新しい投稿を既存の投稿の前に追加（スクロール位置を保持）
        setPosts(prev => {
          const combinedPosts = [...postsArray, ...prev];
          const uniquePosts = combinedPosts.filter((post, index, self) => 
            index === self.findIndex(p => p.postNumber === post.postNumber)
          );
          const sortedPosts = uniquePosts.sort((a, b) => (a.postNumber || 0) - (b.postNumber || 0));
          
          // ページネーション情報を更新
          const totalPosts = data.pagination?.totalPosts || sortedPosts.length;
          const totalPages = Math.ceil(totalPosts / 15); // 15個ずつでページ数を計算
          setTotalPages(totalPages);
          setTotalPosts(totalPosts);
          
          return sortedPosts;
        });
      } else {
        console.error("投稿番号範囲での取得に失敗");
      }
    } catch (error) {
      console.error("投稿番号範囲取得エラー:", error);
    }
  };

  // 従来のAPI取得関数（フォールバック用）
  const fetchPosts = async (page: number = 1) => {
    if (!params.id) return;
    try {
              console.log(`投稿を取得中: threadId=${params.id}, page=${page}`);
        const res = await fetch(`/api/posts?threadId=${params.id}&page=${page}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          const postsArray = Array.isArray(data.posts) ? data.posts : [];
          console.log("取得した投稿数:", postsArray.length);
          console.log("取得した投稿番号:", postsArray.map((p: Post) => p.postNumber).join(', '));
          console.log("ページネーション情報:", data.pagination);
          console.log("取得した投稿:", postsArray);
        
        // 新しいデータが現在のデータと同じかチェック
        const currentPostsString = JSON.stringify(posts);
        const newPostsString = JSON.stringify(postsArray);
        const hasChanged = currentPostsString !== newPostsString;
        
        if (hasChanged) {
          console.log("データが変更されたため、投稿を更新します");
          setPosts(postsArray);
        } else {
          console.log("データに変更がないため、投稿を更新しません");
        }
        
        if (data.pagination) {
          setCurrentPage(data.pagination.currentPage);
          setTotalPages(data.pagination.totalPages);
          setTotalPosts(data.pagination.totalPosts);
        }
      } else {
        console.log("投稿取得エラー:", res.status);
        setPosts([]);
      }
    } catch (error) {
      console.error("投稿取得エラー:", error);
      setPosts([]);
    }
  };

  // 全スレッド検索機能
  const searchAllPosts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log(`全スレッド検索開始: "${query}"`);
      console.log("スレッドID:", params.id);
      console.log("検索クエリ:", query);
      
      const url = `/api/posts/search?threadId=${params.id}&query=${encodeURIComponent(query)}&limit=50`;
      console.log("検索URL:", url);
      
      const res = await fetch(url);
      console.log("検索レスポンス:", res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log("検索結果:", data);
        
        // 画像タグを含む投稿を除外
        const filteredResults = data.posts.filter((post: Post) => {
          // 画像タグが含まれているかチェック
          const hasImageTag = /<img[^>]*>/i.test(post.content);
          if (hasImageTag) {
            console.log("画像タグを含む投稿を除外:", post.postNumber);
            return false;
          }
          return true;
        });
        
        console.log("画像除外後の検索結果:", filteredResults.length, "件");
        setSearchResults(filteredResults);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error("検索APIエラー:", res.status, errorData);
        // APIエラーの場合はページ内検索にフォールバック
        const filtered = posts.filter(post => {
          // 画像タグが含まれているかチェック
          const hasImageTag = /<img[^>]*>/i.test(post.content);
          if (hasImageTag) {
            return false;
          }
          return post.content.toLowerCase().includes(query.toLowerCase());
        });
        console.log("フォールバック検索結果:", filtered.length, "件");
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error("検索エラー:", error);
      // エラーの場合はページ内検索にフォールバック
      const filtered = posts.filter(post => {
        // 画像タグが含まれているかチェック
        const hasImageTag = /<img[^>]*>/i.test(post.content);
        if (hasImageTag) {
          return false;
        }
        return post.content.toLowerCase().includes(query.toLowerCase());
      });
      console.log("エラー時のフォールバック検索結果:", filtered.length, "件");
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  // 検索実行
  const handleSearch = () => {
    console.log("検索ボタンがクリックされました");
    console.log("検索クエリ:", searchQuery);
    
    // 検索クエリが空の場合は何もしない
    if (!searchQuery.trim()) {
      console.log("検索クエリが空のため、検索を実行しません");
      return;
    }
    
    setCurrentSearchQuery(searchQuery); // 検索クエリを保存
    searchAllPosts(searchQuery);
  };

  // 検索クリア
  const clearSearch = () => {
    console.log("検索をクリアします");
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setCurrentSearchQuery(""); // 検索クエリもクリア
    // ページをリロードして通常の投稿表示に戻す
    window.location.reload();
  };

  // 投稿フォームの固定表示を制御するuseEffect（>>が入力されている場合のみ）
  useEffect(() => {
    const checkFixed = () => {
      const hasReferences = />>\d+/.test(content);
      if (!hasReferences) {
        setIsFormFixed(false);
        return;
      }
      if (!formRef.current) return;
      const rect = formRef.current.getBoundingClientRect();
      // 下端がウィンドウ内に見えていれば通常、見えていなければfixed
      setIsFormFixed(!(rect.bottom > 0 && rect.bottom <= window.innerHeight));
    };
    window.addEventListener('scroll', checkFixed);
    window.addEventListener('resize', checkFixed);
    checkFixed();
    return () => {
      window.removeEventListener('scroll', checkFixed);
      window.removeEventListener('resize', checkFixed);
    };
  }, [content]);

  // 固定フォームの位置を計算する関数
  const getFixedFormPosition = () => {
    if (!formRef.current) return {};
    const rect = formRef.current.getBoundingClientRect();
    return {
      left: `${rect.left}px`,
      width: `${rect.width}px`
    };
  };

  // 投稿処理
  async function handlePost() {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content, threadId: params.id }),
      });
      
      if (res.ok) {
        const newPost = await res.json();
        console.log("投稿成功:", newPost);
        setContent("");
        
        // 新しい投稿を既読にする
        setNewPosts([]);
        
        // 投稿成功後、最新の投稿番号を更新
        const dbLatestPostNumber = await getLatestPostNumberFromDB();
        setLastAcquiredPostNumber(dbLatestPostNumber);
        
        // 投稿後は最新ページのデータのみ更新（スクロール位置は保持）
        await updateLatestPageData();
        
        // 投稿投稿後の即座チェックは削除（ポーリングで十分）
        
        // 投稿成功メッセージ
        console.log("投稿が正常に送信されました。他のユーザーにも即座に表示されます。");
      } else {
        const errorData = await res.json();
        // エラーログは表示せず、ユーザーフレンドリーなメッセージのみ表示
        alert(errorData.message || "投稿に失敗しました");
      }
    } catch (error) {
      // エラーログは表示せず、ユーザーフレンドリーなメッセージのみ表示
      alert("投稿に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // 画像アップロード処理
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}のサイズが大きすぎます（5MB以下）`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('threadId', params.id as string);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            console.log("画像アップロード成功:", data.imageUrl);
            setUploadedImages(prev => [...prev, data.imageUrl]);
                                     setContent(prev => prev + `\n<img src="${data.imageUrl}" alt="アップロード画像" style="max-width: 400px; max-height: 400px; width: auto; height: auto; object-fit: contain;" />`);
          } else {
            alert(data.message || "画像のアップロードに失敗しました");
          }
        } else {
          const errorData = await res.json();
          alert(errorData.message || "画像のアップロードに失敗しました");
        }
      }
    } catch (error) {
      // エラーログは表示せず、ユーザーフレンドリーなメッセージのみ表示
      alert("画像のアップロードに失敗しました");
    } finally {
      setLoading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (fixedFileInputRef.current) {
        fixedFileInputRef.current.value = '';
      }
    }
  };

  // 描画機能の保存処理
  const handleDrawingSave = async (imageData: string) => {
    try {
      // 重複投稿防止フラグ
      if (loading) {
        alert("処理中です。しばらくお待ちください。");
        return;
      }
      
      // クライアント側でのセキュリティチェック
      if (!imageData || imageData.length > 1024 * 1024 * 2) { // 2MB制限
        alert("画像データが大きすぎます");
        return;
      }
      
      // 有効なbase64形式かチェック
      if (!imageData.startsWith('data:image/')) {
        alert("無効な画像データです");
        return;
      }
      
      setLoading(true);
      
      // 描画画像をAPIで保存
      const res = await fetch("/api/drawing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageData: imageData,
          threadId: params.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          console.log("描画保存成功:", data.imageUrl);
                                   setContent(prev => prev + `\n<img src="${data.imageUrl}" alt="描画" style="max-width: 400px; max-height: 400px; width: auto; height: auto; object-fit: contain;" />`);
        } else {
          alert(data.message || "描画の保存に失敗しました");
        }
      } else {
        const errorData = await res.json();
        alert(errorData.message || "描画の保存に失敗しました");
      }
    } catch (error) {
      // エラーログは表示せず、ユーザーフレンドリーなメッセージのみ表示
      alert("描画の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 番号クリック処理
  const handleNumberClick = (postNumber: number, event: React.MouseEvent) => {
    // 既存の>>番号を取得
    const existingRefs = content.match(/>>(\d+)/g) || [];
    const existingNumbers = existingRefs.map(ref => ref.replace('>>', ''));
    
    // 同じ番号が既に存在する場合は追加しない
    if (existingNumbers.includes(postNumber.toString())) {
      return;
    }
    
    // URLを更新
    const newUrl = `/threads/${params.id}/post/${postNumber}`;
    window.history.pushState({ postNumber }, '', newUrl);
    
    // 新しい>>番号を追加
    const newRef = `>>${postNumber}`;
    const newContent = content ? `${content}\n${newRef}` : newRef;
    setContent(newContent);
  };

  // 投稿内の「>>番号」をクリックした時の処理
  const handleReferenceClick = async (postNumber: number, event: React.MouseEvent) => {
    try {
      console.log(`>>${postNumber} がクリックされました`);
      console.log("クリックイベント:", event);
      console.log("現在のposts:", posts);
      console.log("現在のmainPosts:", mainPosts);
      console.log("現在のshowMainModals:", showMainModals);
      
      // event.currentTargetを事前に保存（非同期処理で無効になるため）
      const currentTarget = event.currentTarget;
      console.log("保存されたcurrentTarget:", currentTarget);
      
      // まず現在のページから検索
      let targetPost = posts.find(post => post.postNumber === postNumber);
      console.log(`現在のページでの検索結果:`, targetPost ? `投稿番号 ${targetPost.postNumber}` : "見つかりません");
      
      // 現在のページにない場合は全ページから検索
      if (!targetPost) {
        console.log("全ページから検索します");
        targetPost = await searchPostByNumber(postNumber);
        console.log("全ページ検索結果:", targetPost);
      }
      
      if (targetPost && currentTarget) {
        console.log("モーダルを表示します:", targetPost);
        const rect = currentTarget.getBoundingClientRect();
        console.log("クリック位置:", rect);
        
        const newPost = { ...targetPost, clickPosition: { top: rect.top, left: rect.left } };
        console.log("新しい投稿オブジェクト:", newPost);
        
        setMainPosts(prev => {
          const newPosts = [...prev, newPost];
          console.log("新しいmainPosts:", newPosts);
          return newPosts;
        });
        
        setShowMainModals(prev => {
          const newModals = [...prev, true];
          console.log("新しいshowMainModals:", newModals);
          return newModals;
        });
        
        console.log("状態更新完了");
      } else {
        console.log("投稿が見つからないか、イベントターゲットが無効です");
        console.log("targetPost:", targetPost);
        console.log("currentTarget:", currentTarget);
        
        if (!targetPost) {
          console.log("targetPostが見つかりませんでした");
          // 存在しない投稿番号の場合でもモーダルを表示
          if (currentTarget) {
            const rect = currentTarget.getBoundingClientRect();
            const notFoundPost: Post = {
              _id: `not-found-${postNumber}`,
              threadId: params.id as string,
              postNumber: postNumber,
              content: `投稿番号 ${postNumber} は存在しません。`,
              createdAt: new Date().toISOString(),
              clickPosition: { top: rect.top, left: rect.left }
            };
            console.log("存在しない投稿オブジェクト:", notFoundPost);
            
            setMainPosts(prev => {
              const newPosts = [...prev, notFoundPost];
              console.log("新しいmainPosts (存在しない場合):", newPosts);
              return newPosts;
            });
            
            setShowMainModals(prev => {
              const newModals = [...prev, true];
              console.log("新しいshowMainModals (存在しない場合):", newModals);
              return newModals;
            });
          }
        }
        if (!currentTarget) {
          console.log("currentTargetが無効です");
        }
      }
    } catch (error) {
      console.error("参照クリックエラー:", error);
      // エラーが発生した場合でも、存在しない投稿として表示
      const currentTarget = event.currentTarget;
      if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect();
        const errorPost: Post = {
          _id: `error-${postNumber}`,
          threadId: params.id as string,
          postNumber: postNumber,
          content: `投稿番号 ${postNumber} の取得中にエラーが発生しました。`,
          createdAt: new Date().toISOString(),
          clickPosition: { top: rect.top, left: rect.left }
        };
        console.log("エラー投稿オブジェクト:", errorPost);
        
        setMainPosts(prev => [...prev, errorPost]);
        setShowMainModals(prev => [...prev, true]);
      }
    }
  };

  // 最新ページを取得する関数
  // 最初のページに移動する関数
  const goToFirstPage = async () => {
    if (!params.id) return;
    try {
      console.log("最初のページに移動開始");
      const res = await fetch(`/api/posts?threadId=${params.id}&page=1&limit=40`);
      if (res.ok) {
        const data = await res.json();
        const postsArray = Array.isArray(data.posts) ? data.posts : [];
        console.log(`最初のページの投稿数: ${postsArray.length}`);
        
        setCurrentPage(1);
        setTotalPages(data.pagination.totalPages);
        setTotalPosts(data.pagination.totalPosts);
        setPosts(postsArray);
        
        // URLを更新（投稿番号ベース）
        const newUrl = `/threads/${params.id}`;
        window.history.pushState({ page: 1 }, '', newUrl);
        
        console.log("最初のページへの移動完了");
        
        // ページトップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.error("最初のページの取得に失敗");
      }
    } catch (error) {
      console.error("最初のページ取得エラー:", error);
    }
  };

  // 最新ページのデータのみ更新する関数（スクロール位置は保持）
  const updateLatestPageData = async () => {
    if (!params.id) return;
    try {
      console.log("最新ページデータ更新開始 - スレッドID:", params.id);
      // まず総投稿数を取得して最新ページを計算
      const res = await fetch(`/api/posts?threadId=${params.id}&page=1&limit=40`);
      if (res.ok) {
        const data = await res.json();
        console.log("APIレスポンス:", data);
        console.log("ページネーション情報:", data.pagination);
        
        if (data.pagination && data.pagination.totalPages > 0) {
          const latestPage = data.pagination.totalPages;
          console.log(`最新ページ: ${latestPage} / 総ページ数: ${data.pagination.totalPages}`);
          
          // 最新ページの投稿を取得
          const latestRes = await fetch(`/api/posts?threadId=${params.id}&page=${latestPage}&limit=40`);
          if (latestRes.ok) {
            const latestData = await latestRes.json();
            const postsArray = Array.isArray(latestData.posts) ? latestData.posts : [];
            console.log(`最新ページの投稿数: ${postsArray.length}`);
            
            // 状態を更新（スクロール位置は保持）
            setCurrentPage(latestPage);
            setTotalPages(data.pagination.totalPages);
            setTotalPosts(data.pagination.totalPosts);
            setPosts(postsArray);
            
            // URLを更新（投稿番号ベース）
            const newUrl = `/threads/${params.id}`;
            window.history.pushState({ page: latestPage }, '', newUrl);
            
            console.log("最新ページデータ更新完了");
          } else {
            console.error("最新ページの投稿取得に失敗");
          }
        } else {
          console.log("ページネーション情報が取得できませんでした");
          // 1ページのみの場合の処理
          const postsArray = Array.isArray(data.posts) ? data.posts : [];
          setPosts(postsArray);
          setCurrentPage(1);
          setTotalPages(1);
          setTotalPosts(postsArray.length);
        }
      } else {
        console.error("APIリクエストに失敗:", res.status);
      }
    } catch (error) {
      console.error("最新ページデータ更新エラー:", error);
    }
  };

  // 最新のページに移動する関数
  const goToLatestPage = async () => {
    if (!params.id) return;
    try {
      console.log("最新ページ取得開始 - スレッドID:", params.id);
      // まず総投稿数を取得して最新ページを計算
      const res = await fetch(`/api/posts?threadId=${params.id}&page=1&limit=40`);
      if (res.ok) {
        const data = await res.json();
        console.log("APIレスポンス:", data);
        console.log("ページネーション情報:", data.pagination);
        
        if (data.pagination && data.pagination.totalPages > 0) {
          const latestPage = data.pagination.totalPages;
          console.log(`最新ページ: ${latestPage} / 総ページ数: ${data.pagination.totalPages}`);
          
          // 最新ページの投稿を取得
          const latestRes = await fetch(`/api/posts?threadId=${params.id}&page=${latestPage}&limit=40`);
          if (latestRes.ok) {
            const latestData = await latestRes.json();
            const postsArray = Array.isArray(latestData.posts) ? latestData.posts : [];
            console.log(`最新ページの投稿数: ${postsArray.length}`);
            
            // 状態を更新
            setCurrentPage(latestPage);
            setTotalPages(data.pagination.totalPages);
            setTotalPosts(data.pagination.totalPosts);
            setPosts(postsArray);
            
            // URLを更新（投稿番号ベース）
            const newUrl = `/threads/${params.id}`;
            window.history.pushState({ page: latestPage }, '', newUrl);
            
            console.log("最新ページへの移動完了");
            
            // ページトップにスクロール
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            console.error("最新ページの投稿取得に失敗");
          }
        } else {
          console.log("ページネーション情報が取得できませんでした");
          // 1ページのみの場合の処理
          const postsArray = Array.isArray(data.posts) ? data.posts : [];
          setPosts(postsArray);
          setCurrentPage(1);
          setTotalPages(1);
          setTotalPosts(postsArray.length);
        }
      } else {
        console.error("APIリクエストに失敗:", res.status);
      }
    } catch (error) {
      console.error("最新ページ取得エラー:", error);
    }
  };

  // ページネーション処理（現在表示されている一番古い投稿の前から15個ずつ取得）
  const handlePageChange = (newPage: number) => {
    console.log(`ページ変更: ${currentPage} → ${newPage}`);
    setCurrentPage(newPage);
    // 新しい投稿を既読にする
    setNewPosts([]);
    
    // URLを更新（投稿番号ベース）
    const newUrl = `/threads/${params.id}`;
    window.history.pushState({ page: newPage }, '', newUrl);
    
    // SSE接続を一時的に閉じてページネーションを保護
    if (eventSourceRef.current) {
      console.log("ページ変更時にSSE接続を一時的に閉じます");
      eventSourceRef.current.close();
    }
    
    // 従来のAPIでデータを取得（15個ずつ）
    fetchPosts(newPage).then(() => {
      // データ取得後にSSE接続を再開
      setTimeout(() => {
        console.log("ページ変更後にSSE接続を再開します");
        // SSE接続は自動的に再開される（useEffectで監視）
      }, 1000);
    });
    
    // スクロール位置は保持（ページトップにスクロールしない）
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 投稿番号から投稿を検索する関数
  const searchPostByNumber = async (postNumber: number) => {
    try {
      console.log(`投稿番号 ${postNumber} を検索中...`);
      const res = await fetch(`/api/posts/search?threadId=${params.id}&postNumber=${postNumber}`);
      console.log(`検索レスポンス: ${res.status}`);
      if (res.ok) {
        const post = await res.json();
        console.log(`投稿が見つかりました:`, post);
        return post;
      } else {
        const errorData = await res.json();
        console.log(`投稿番号 ${postNumber} が見つかりません:`, errorData);
        return null;
      }
    } catch (error) {
      console.error("投稿検索エラー:", error);
      return null;
    }
  };

  // ネストしたモーダル用の参照クリック関数
  const handleNestedReferenceClick = async (postNumber: number, event: React.MouseEvent) => {
    try {
      console.log(`ネスト >>${postNumber} がクリックされました`);
      
      // event.currentTargetを事前に保存（非同期処理で無効になるため）
      const currentTarget = event.currentTarget;
      console.log("保存されたネストcurrentTarget:", currentTarget);
      
      // まず現在のページから検索
      let targetPost = posts.find(post => post.postNumber === postNumber);
      console.log(`現在のページでの検索結果:`, targetPost ? `投稿番号 ${targetPost.postNumber}` : "見つかりません");
      
      // 現在のページにない場合は全ページから検索
      if (!targetPost) {
        console.log("全ページから検索します");
        targetPost = await searchPostByNumber(postNumber);
      }
      
      if (targetPost && currentTarget) {
        console.log("ネストモーダルを表示します:", targetPost);
        const rect = currentTarget.getBoundingClientRect();
        setNestedPosts(prev => [...prev, { ...targetPost, clickPosition: { top: rect.top, left: rect.left } }]);
        setShowNestedModals(prev => [...prev, true]);
      } else {
        console.log("投稿が見つからないか、イベントターゲットが無効です");
        if (!targetPost) {
          console.log("targetPostが見つかりませんでした");
          // 存在しない投稿番号の場合でもモーダルを表示
          if (currentTarget) {
            const rect = currentTarget.getBoundingClientRect();
            const notFoundPost: Post = {
              _id: `not-found-nested-${postNumber}`,
              threadId: params.id as string,
              postNumber: postNumber,
              content: `投稿番号 ${postNumber} は存在しません。`,
              createdAt: new Date().toISOString(),
              clickPosition: { top: rect.top, left: rect.left }
            };
            setNestedPosts(prev => [...prev, notFoundPost]);
            setShowNestedModals(prev => [...prev, true]);
          }
        }
      }
    } catch (error) {
      console.error("ネスト参照クリックエラー:", error);
      // エラーが発生した場合でも、存在しない投稿として表示
      const currentTarget = event.currentTarget;
      if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect();
        const errorPost: Post = {
          _id: `error-nested-${postNumber}`,
          threadId: params.id as string,
          postNumber: postNumber,
          content: `投稿番号 ${postNumber} の取得中にエラーが発生しました。`,
          createdAt: new Date().toISOString(),
          clickPosition: { top: rect.top, left: rect.left }
        };
        setNestedPosts(prev => [...prev, errorPost]);
        setShowNestedModals(prev => [...prev, true]);
      }
    }
  };

  // ネストしたモーダルを閉じる関数
  const handleCloseNestedModal = (index: number) => {
    setNestedPosts(prev => prev.filter((_, i) => i !== index));
    setShowNestedModals(prev => prev.filter((_, i) => i !== index));
  };

  // メインモーダルを閉じる関数
  const handleCloseMainModal = (index: number) => {
    setMainPosts(prev => prev.filter((_, i) => i !== index));
    setShowMainModals(prev => prev.filter((_, i) => i !== index));
  };

  // モーダルの位置を計算する関数
  const getModalPosition = (index: number) => {
    try {
      const mainPost = mainPosts[index];
      if (mainPost?.clickPosition) {
        return mainPost.clickPosition;
      }
    } catch (error) {
      console.error("モーダル位置計算エラー:", error);
    }
    return { top: '50%', left: '50%' };
  };

  // ネストしたモーダルの位置を計算する関数
  const getNestedModalPosition = (index: number) => {
    try {
      const nestedPost = nestedPosts[index];
      if (nestedPost?.clickPosition) {
        return nestedPost.clickPosition;
      }
    } catch (error) {
      console.error("ネストモーダル位置計算エラー:", error);
    }
    return { top: '45%', left: '55%' };
  };

  // 投稿内容をレンダリングする関数
  const renderPostContent = (content: string) => {
    // HTMLタグを適切に処理
    if (content.includes('<img')) {
      // 画像タグにcrossorigin属性を追加
      const processedContent = content.replace(/<img/g, '<img crossorigin="anonymous"');
      
      // 番号参照を先に処理してから、残りの部分をサニタイズ
      const parts = processedContent.split(/(>>\d+)/g);
      console.log("画像投稿の分割結果:", parts);
      const result = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`部分 ${i}: "${part}"`);
        // 改行文字を含む番号参照も検出
        const match = part.match(/^>>(\d+)$/);
        console.log(`部分 ${i} のマッチ結果:`, match);
        
        if (match) {
          const postNumber = parseInt(match[1]);
          result.push(
            <button
              key={i}
              onClick={async (e) => {
                console.log(`画像投稿内の投稿番号ボタンがクリックされました: ${postNumber}`);
                console.log("画像投稿内クリックイベント:", e);
                await handleReferenceClick(postNumber, e);
              }}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-blue-50 hover:bg-blue-100 px-1 rounded transition-colors"
              style={{backgroundColor: '#dbeafe'}}
            >
              {postNumber}
            </button>
          );
        } else {
          // HTMLコンテンツとして処理（画像タグを含む可能性）
          if (part.includes('<img')) {
            // 画像タグを安全に処理（番号参照が含まれていない部分のみサニタイズ）
            result.push(
              <span
                key={i}
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHTML(part)
                }} 
                className="post-content"
              />
            );
          } else {
            // 通常のテキストとして処理（改行文字も適切に表示）
            result.push(<span key={i} style={{whiteSpace: 'pre-wrap'}}>{part}</span>);
          }
        }
      }
      
      return <div className="post-content">{result}</div>;
    }
    
    // >>number のパターンを検出してクリック可能なボタンに変換
    const parts = content.split(/(>>\d+)/g);
    return parts.map((part, index) => {
      const match = part.match(/^>>(\d+)$/);
      if (match) {
        const postNumber = parseInt(match[1]);
        const targetPost = posts.find(p => p.postNumber === postNumber);
        
        // 現在のページにない場合でもクリック可能にする（全ページ検索される）
        return (
          <button
            key={`ref-${postNumber}-${index}`}
            onClick={async (e) => {
              console.log(`投稿番号ボタンがクリックされました: ${postNumber}`);
              console.log("クリックイベント:", e);
              await handleReferenceClick(postNumber, e);
            }}
            className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-blue-50 hover:bg-blue-100 px-1 rounded transition-colors"
            style={{backgroundColor: '#dbeafe'}}
          >
            {postNumber}
          </button>
        );
      }
      
      // ハイライト機能を削除 - 通常の投稿表示ではハイライトしない
      return <span style={{whiteSpace: 'pre-wrap'}}>{part}</span>;
    });
  };

  // ネストしたモーダル用のレンダリング関数
  const renderNestedPostContent = (content: string) => {
    // HTMLタグを適切に処理
    if (content.includes('<img')) {
      // 画像タグにcrossorigin属性を追加
      const processedContent = content.replace(/<img/g, '<img crossorigin="anonymous"');
      
      // 画像投稿でも>>番号を処理（より詳細な処理）
      const parts = processedContent.split(/(>>\d+)/g);
      const result = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const match = part.match(/^>>(\d+)$/);
        
        if (match) {
          const postNumber = parseInt(match[1]);
          result.push(
            <button
              key={i}
              onClick={async (e) => {
                console.log(`ネスト画像投稿内の投稿番号ボタンがクリックされました: ${postNumber}`);
                console.log("ネスト画像投稿内クリックイベント:", e);
                await handleNestedReferenceClick(postNumber, e);
              }}
              className="text-blue-600 font-bold hover:text-blue-800 cursor-pointer underline px-2 py-1 rounded mx-1"
              data-nested-post-number={postNumber}
            >
              {postNumber}
            </button>
          );
        } else {
          // HTMLコンテンツとして処理（画像タグを含む可能性）
          if (part.includes('<img')) {
            // 画像タグを安全に処理
            result.push(
              <span
                key={i}
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHTML(part)
                }} 
                className="post-content"
              />
            );
          } else {
            // 通常のテキストとして処理
            result.push(<span key={i}>{part}</span>);
          }
        }
      }
      
      return <div className="post-content">{result}</div>;
    }
    
    // 通常のテキスト投稿の場合
    const referenceRegex = />>(\d+)/g;
    const parts = content.split(referenceRegex);
    const result = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        result.push(<span key={i}>{parts[i]}</span>);
      } else {
        const postNumber = parseInt(parts[i]);
        // 現在のページにない場合でもクリック可能にする（全ページ検索される）
        result.push(
          <button
            key={i}
            onClick={async (e) => {
              console.log(`ネスト投稿番号ボタンがクリックされました: ${postNumber}`);
              console.log("ネストクリックイベント:", e);
              await handleNestedReferenceClick(postNumber, e);
            }}
            className="text-blue-600 font-bold hover:text-blue-800 cursor-pointer underline px-2 py-1 rounded mx-1"
            data-nested-post-number={postNumber}
          >
            {postNumber}
          </button>
        );
      }
    }

    return result;
  };

  // 投稿内容をハイライト付きでレンダリングする関数（検索実行後のみ使用）
  const renderPostContentWithHighlight = (content: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return renderPostContent(content);
    }
    
    // HTMLタグを適切に処理
    if (content.includes('<img')) {
      // 画像タグにcrossorigin属性を追加
      const processedContent = content.replace(/<img/g, '<img crossorigin="anonymous"');
      
      // 画像投稿でも>>番号を処理（より詳細な処理）
      const parts = processedContent.split(/(>>\d+)/g);
      const result = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const match = part.match(/^>>(\d+)$/);
        
        if (match) {
          const postNumber = parseInt(match[1]);
          result.push(
            <button
              key={`search-ref-${postNumber}-${i}`}
              onClick={async (e) => {
                console.log(`検索結果画像投稿内の投稿番号ボタンがクリックされました: ${postNumber}`);
                console.log("検索結果画像投稿内クリックイベント:", e);
                await handleReferenceClick(postNumber, e);
              }}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-blue-50 hover:bg-blue-100 px-1 rounded transition-colors"
              style={{backgroundColor: '#dbeafe'}}
            >
              {postNumber}
            </button>
          );
        } else {
          // HTMLコンテンツとして処理（画像タグを含む可能性）
          if (part.includes('<img')) {
            // 画像タグを安全に処理
            result.push(
              <span
                key={i}
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHTML(part)
                }} 
                className="post-content"
              />
            );
          } else {
            // 通常のテキストとして処理（ハイライト適用）
            const textContent = part;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            const highlightedParts = textContent.split(regex);
            
            result.push(
              <span key={i}>
                {highlightedParts.map((highlightPart, highlightIndex) => 
                  regex.test(highlightPart) ? (
                    <mark key={`highlight-${i}-${highlightIndex}`} className="bg-yellow-300 px-1 rounded font-semibold inline-block">
                      {highlightPart}
                    </mark>
                  ) : (
                    <span key={`highlight-${i}-${highlightIndex}`}>{highlightPart}</span>
                  )
                )}
              </span>
            );
          }
        }
      }
      
      return <div className="post-content">{result}</div>;
    }
    
    // >>number のパターンを検出してクリック可能なボタンに変換
    const parts = content.split(/(>>\d+)/g);
    return parts.map((part, index) => {
      const match = part.match(/^>>(\d+)$/);
      if (match) {
        const postNumber = parseInt(match[1]);
        
        // 現在のページにない場合でもクリック可能にする（全ページ検索される）
        return (
          <button
            key={`search-ref-${postNumber}-${index}`}
            onClick={async (e) => {
              console.log(`検索結果内の投稿番号ボタンがクリックされました: ${postNumber}`);
              console.log("検索結果内クリックイベント:", e);
              await handleReferenceClick(postNumber, e);
            }}
            className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-blue-50 hover:bg-blue-100 px-1 rounded transition-colors"
            style={{backgroundColor: '#dbeafe'}}
          >
            {postNumber}
          </button>
        );
      }
      
      // 固定された検索クエリでハイライトを適用
      const textContent = part;
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const highlightedParts = textContent.split(regex);
      
      return (
        <span key={index}>
          {highlightedParts.map((highlightPart, highlightIndex) => 
            regex.test(highlightPart) ? (
              <mark key={`highlight-${index}-${highlightIndex}`} className="bg-yellow-300 px-1 rounded font-semibold inline-block">
                {highlightPart}
              </mark>
            ) : (
              <span key={`highlight-${index}-${highlightIndex}`}>{highlightPart}</span>
            )
          )}
        </span>
      );
    });
  };

  if (!thread) {
    return <div className="text-center text-zinc-400 py-24">スレッド情報を取得中...</div>;
  }

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
        <main className="w-full min-h-screen" style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
        }}>
          {/* ヘッダー */}
          <div className="flex flex-col items-center p-4" style={{
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)',
            boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)'
          }}>
            {/* 一段目：ホームボタンとナビゲーションボタン */}
            <div className="flex items-center gap-4 mb-4">
              <a href="/home" className="flex items-center justify-center px-6 py-3 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-base border-none transform hover:scale-105 active:scale-95" style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
                minWidth: '48px', 
                minHeight: '48px',
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
              }}>
                <span><i className="fas fa-home text-lg"></i></span>
              </a>

              {/* ナビゲーションボタン */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToFirstPage}
                  className="flex items-center justify-center px-4 py-3 text-gray-700 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-bold text-sm border-none transform hover:scale-105 active:scale-95"
                  style={{ 
                    minWidth: '60px', 
                    minHeight: '48px',
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <span>最初</span>
                </button>
                <button
                  onClick={goToLatestPage}
                  className="flex items-center justify-center px-4 py-3 text-text-primary rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-bold text-sm border-none transform hover:scale-105 active:scale-95"
                  style={{ 
                    minWidth: '60px', 
                    minHeight: '48px',
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <span>最新</span>
                </button>
                <button
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center justify-center px-4 py-3 text-gray-700 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-bold text-sm border-none transform hover:scale-105 active:scale-95"
                  style={{ 
                    minWidth: '60px', 
                    minHeight: '48px',
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                    boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)'
                  }}
                >
                  <i className="fas fa-chevron-down text-lg"></i>
                </button>
              </div>
            </div>

            {/* 二段目：検索バー */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <div className="absolute left-3 text-text-primary">
                  <i className="fas fa-search"></i>
                </div>
                <input
                  type="text"
                  placeholder="スレ内を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-12 py-3 border-2 border-border-primary rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400 bg-white shadow-lg hover:shadow-xl transition-all duration-300 text-text-primary placeholder-text-primary"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 text-text-primary hover:text-text-primary transition-colors duration-200"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex items-center justify-center px-6 py-3 text-white rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-base border-none transform hover:scale-105 active:scale-95"
                style={{ 
                  minWidth: '48px', 
                  minHeight: '48px',
                  background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                  boxShadow: '0 10px 25px rgba(253, 242, 248, 0.3)'
                }}
              >
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin text-lg"></i>
                ) : (
                  <i className="fas fa-search text-lg"></i>
                )}
              </button>
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-b border-pink-200" style={{
            background: 'linear-gradient(90deg, transparent 0%, #f9a8d4 50%, transparent 100%)',
            height: '2px'
          }}></div>

          <div className="w-full">
            {/* ローディング中の表示 */}
            {isLoading && (
              <div className="flex items-center justify-center py-20 bg-white">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
                  <p className="text-text-primary font-medium">スレッドを読み込み中...</p>
                </div>
              </div>
            )}

            {/* スレッド情報と投稿表示 */}
            {!isLoading && thread && (
              <div>
                                 {/* 最初のコメント（スレッド作成者） */}
                 <div className="p-4 border-b border-gray-300 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300" style={{
                   background: 'linear-gradient(to right, #fbd3e6, #fce4ec)',
                   backgroundImage: 'url("/back.svg")',
                   backgroundSize: 'auto',
                   backgroundRepeat: 'repeat',
                   backgroundBlendMode: 'overlay'
                 }}>
                  <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => handleNumberClick(1, e)}
                          className="text-sm text-white px-3 py-1 rounded-md font-bold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                            boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)',
                          }}
                        >
                          1
                        </button>
                        <span className="text-sm text-gray-700 font-medium">{new Date(thread.createdAt).toLocaleString()}</span>
                        <span className="text-sm text-pink-600 font-bold">ID:主</span>
                      </div>
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words ml-0">
                        <div className="font-bold text-lg mb-2 text-gray-900">{thread.title}</div>
                        <div className="text-base text-gray-700">{thread.description}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* メッセージエリア */}
                <div className="flex-1">
                  {/* 上側ページネーション（常に表示） */}
                  {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-3 py-6 border-b border-gray-200" style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                    }}>
                      {/* ページボタン行 */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
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
                        
                        <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border-2 border-pink-200" style={{backgroundColor: '#ffffff'}}>
                          <span className="text-lg font-bold text-pink-600">{currentPage}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-lg font-bold text-pink-600">{totalPages}</span>
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
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
                      
                      {/* 表示件数行 */}
                      <div className="text-sm text-gray-600 font-medium bg-white px-4 py-2 rounded-full shadow-md border border-gray-200" style={{backgroundColor: '#ffffff'}}>
                        全{totalPosts}件中 {((currentPage - 1) * 15) + 1}-{Math.min(currentPage * 15, totalPosts)}件を表示
                      </div>
                    </div>
                  )}
                  
                  {/* 検索結果表示 */}
                  {searchResults.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                    }}>
                      {/* 検索結果ヘッダー */}
                      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-100 to-purple-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-search text-pink-600"></i>
                            <span className="text-sm font-medium text-gray-700">
                              「{currentSearchQuery}」で全スレッド検索
                            </span>
                          </div>
                          <div className="text-sm text-pink-600 font-bold bg-white px-3 py-1 rounded-full shadow-sm border border-pink-200">
                            {searchResults.length}件ヒット!
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white">
                        {searchResults.length > 0 ? (
                          searchResults.map((post, index) => (
                            <div
                              key={`search-${post._id}-${post.postNumber}`}
                              className="p-3 border-b border-gray-300 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                              style={{
                                background: 'linear-gradient(to right, #fbd3e6, #fce4ec)',
                                backgroundImage: 'url("/back.svg")',
                                backgroundSize: 'auto',
                                backgroundRepeat: 'repeat',
                                backgroundBlendMode: 'overlay'
                              }}
                            >
                              <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => handleNumberClick(post.postNumber || index + 2, e)}
                                      className="text-sm text-white px-3 py-1 rounded-md font-bold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                                      style={{
                                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                                        boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)',
                                      }}
                                    >
                                      {post.postNumber || index + 2}
                                    </button>
                                    <span className="text-sm text-gray-700 font-medium">{new Date(post.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words ml-0 post-content">
                                    {(() => {
                                      console.log("投稿内容:", post.content);
                                      return post.content.includes('<img') ? (
                                        <div 
                                          dangerouslySetInnerHTML={{ 
                                            __html: sanitizeHTML(post.content.replace(/<img/g, '<img crossorigin="anonymous"'))
                                          }} 
                                          className="post-content"
                                        />
                                      ) : (
                                        renderPostContentWithHighlight(post.content, currentSearchQuery)
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-zinc-400 py-12 bg-white">
                            <i className="fas fa-search text-4xl mb-4"></i>
                            <p>検索結果がありません</p>
                            <p className="text-sm mt-2">「{currentSearchQuery}」に一致する投稿が見つかりませんでした</p>
                          </div>
                        )}
                      </div>
                      
                      {/* 元のスレッドに戻るボタン */}
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <button
                          onClick={clearSearch}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
                        >
                          <i className="fas fa-arrow-left"></i>
                          元のスレッドに戻る
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 新しい投稿の表示（目立たない） */}
                  {newPosts.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                    }}>
                      <div className="p-2 bg-blue-50 border-b border-blue-200">
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <i className="fas fa-plus text-xs"></i>
                          新しい投稿 ({newPosts.length}件)
                        </span>
                      </div>
                      {newPosts.map((post, index) => (
                        <div
                          key={`new-${post._id}-${post.postNumber}`}
                          className="p-3 border-b border-blue-200 bg-blue-50 rounded-lg shadow-sm"
                          style={{
                            background: 'linear-gradient(to right, #fbd3e6, #fce4ec)',
                            backgroundImage: 'url("/back.svg")',
                            backgroundSize: 'auto',
                            backgroundRepeat: 'repeat',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-sm">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => handleNumberClick(post.postNumber || 0, e)}
                                  className="text-sm text-white px-3 py-1 rounded-md font-bold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                                  style={{
                                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                                    boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)',
                                  }}
                                >
                                  {post.postNumber || 0}
                                </button>
                                <span className="text-sm text-gray-700 font-medium">{new Date(post.createdAt).toLocaleString()}</span>
                              </div>
                                                                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words ml-0 post-content">
                                    {(() => {
                                      console.log("新しい投稿内容:", post.content);
                                      return renderPostContent(post.content);
                                    })()}
                                  </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 通常の投稿一覧表示 */}
                  {searchResults.length === 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                    }}>
                      {isLoading ? (
                        <div className="text-center text-zinc-400 py-12" style={{
                          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                        }}>
                          <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
                          <p>読み込み中...</p>
                        </div>
                      ) : posts.length > 0 ? (
                        <div style={{
                          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                        }}>
                                                    {/* 新しく取得した投稿（取得後の投稿） */}
                      {hasFetchedAllPosts && getUniquePosts(posts.filter(post => {
                        // 取得前の一番古い投稿番号を計算
                        const oldestPostNumber = originalPosts.length > 0 ? Math.min(...originalPosts.map(p => p.postNumber || 0)) : 0;
                        return post.postNumber < oldestPostNumber;
                      })).map((post, index) => (
                            <div
                              key={`fetched-${post._id}-${post.postNumber}`}
                              data-post-number={post.postNumber}
                              className="p-3 border-b border-gray-300 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                              style={{
                                background: 'linear-gradient(to right, #fbd3e6, #fce4ec)',
                                backgroundImage: 'url("/back.svg")',
                                backgroundSize: 'auto',
                                backgroundRepeat: 'repeat',
                                backgroundBlendMode: 'overlay'
                              }}
                            >
                              <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => handleNumberClick(post.postNumber || 0, e)}
                                      className="text-sm text-white px-3 py-1 rounded-md font-bold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                                      style={{
                                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                                        boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)',
                                      }}
                                    >
                                      {post.postNumber || 0}
                                    </button>
                                    <span className="text-sm text-gray-700 font-medium">{new Date(post.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words ml-0 post-content">
                                    {(() => {
                                      console.log("投稿内容:", post.content);
                                      return renderPostContent(post.content);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* 前のレスを取得ボタンとメッセージ */}
                          <div className="flex justify-center p-4">
                            {!hasFetchedAllPosts ? (
                              <button
                                onClick={fetchAllPosts}
                                disabled={isLoadingMore}
                                className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-700 rounded-full shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
                                style={{
                                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)',
                                  boxShadow: '0 4px 15px rgba(243, 244, 246, 0.4)',
                                  border: '2px solid #e5e7eb'
                                }}
                              >
                                <i className="fas fa-chevron-up text-xs"></i>
                                <span>{isLoadingMore ? "読み込み中..." : "前のレスを取得"}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-600 rounded-full shadow-lg bg-gray-100 border-2 border-gray-300 cursor-not-allowed">
                                <i className="fas fa-check text-green-600"></i>
                                <span>取得しました</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 広告エリア（取得完了時に表示） */}
                          {hasFetchedAllPosts && (
                            <div className="w-full bg-white border-t-2 border-gray-300 py-4">
                              <div className="max-w-4xl mx-auto flex justify-center">
                                <AdBanner type="wide" />
                              </div>
                            </div>
                          )}
                          
                          
                          {/* 既存の投稿（取得前の投稿） */}
                          {getUniquePosts(posts.filter(post => {
                            // 取得前の一番古い投稿番号を計算
                            const oldestPostNumber = originalPosts.length > 0 ? Math.min(...originalPosts.map(p => p.postNumber || 0)) : 0;
                            return !hasFetchedAllPosts || post.postNumber >= oldestPostNumber;
                          })).map((post, index) => (
                            <div
                              key={`main-${post._id}-${post.postNumber}`}
                              data-post-number={post.postNumber}
                              className="p-3 border-b border-gray-300 bg-white rounded-lg shadow-sm"
                              style={{
                                background: 'linear-gradient(to right, #fbd3e6, #fce4ec)',
                                backgroundSize: 'auto',
                                backgroundRepeat: 'repeat',
                                backgroundBlendMode: 'overlay'
                              }}
                            >
                              <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => handleNumberClick(post.postNumber || 0, e)}
                                      className="text-sm text-white px-3 py-1 rounded-md font-bold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                                      style={{
                                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                                        boxShadow: '0 2px 8px rgba(253, 242, 248, 0.3)',
                                      }}
                                    >
                                      {post.postNumber || 0}
                                    </button>
                                    <span className="text-sm text-gray-700 font-medium">{new Date(post.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words ml-0 post-content">
                                    {(() => {
                                      console.log("投稿内容:", post.content);
                                      return renderPostContent(post.content);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-zinc-400 py-12 bg-white">
                          <i className="fas fa-comments text-4xl mb-4"></i>
                          <p>まだ書き込みがありません</p>
                          <p className="text-sm mt-2">最初の投稿をしてみましょう！</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 下側ページネーション（前のレスを取得ボタンが押されていない場合のみ表示） */}
                  {totalPages > 1 && !hasFetchedAllPosts && (
                    <div className="flex flex-col items-center gap-3 py-6 border-t border-gray-200" style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                    }}>
                      {/* ページボタン行 */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
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
                        
                        <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border-2 border-pink-200" style={{backgroundColor: '#ffffff'}}>
                          <span className="text-lg font-bold text-pink-600">{currentPage}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-lg font-bold text-pink-600">{totalPages}</span>
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
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
                      
                      {/* 表示件数行 */}
                      <div className="text-sm text-gray-600 font-medium bg-white px-4 py-2 rounded-full shadow-md border border-gray-200" style={{backgroundColor: '#ffffff'}}>
                        全{totalPosts}件中 {((currentPage - 1) * 15) + 1}-{Math.min(currentPage * 15, totalPosts)}件を表示
                      </div>
                    </div>
                  )}
                </div>

                {/* 投稿フォーム（動的固定表示） */}
                <div className="border-t border-zinc-200 p-4" style={{
                  background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf2f8 100%)'
                }}>
                  {/* 元の位置のdivにrefを付与 */}
                  <div ref={formOriginRef} className="max-w-md mx-auto">
                    {/* 通常のフォーム（元の位置） */}
                    <div ref={formRef} style={{ opacity: isFormFixed ? 0 : 1 }}>
                      <FormContent
                        showPollModal={showPollModal}
                        setShowPollModal={setShowPollModal}
                        pollTitle={pollTitle}
                        setPollTitle={setPollTitle}
                        pollOptions={pollOptions}
                        setPollOptions={setPollOptions}
                        pollDeadline={pollDeadline}
                        setPollDeadline={setPollDeadline}
                        handleAddOption={handleAddOption}
                        handleRemoveOption={handleRemoveOption}
                        handleOptionChange={handleOptionChange}
                        handlePollSubmit={handlePollSubmit}
                        content={content}
                        setContent={setContent}
                        setShowDrawingModal={setShowDrawingModal}
                        textareaRef={textareaRef}
                        handlePost={handlePost}
                        loading={loading}
                        fileInputRef={fileInputRef}
                        handleImageUpload={handleImageUpload}
                      />
                    </div>
                    {/* 固定フォーム（>>がある場合のみ表示） */}
                    {isFormFixed && (
                      <div className="fixed bottom-4 z-50" style={getFixedFormPosition()}>
                        <FormContent
                          showPollModal={showPollModal}
                          setShowPollModal={setShowPollModal}
                          pollTitle={pollTitle}
                          setPollTitle={setPollTitle}
                          pollOptions={pollOptions}
                          setPollOptions={setPollOptions}
                          pollDeadline={pollDeadline}
                          setPollDeadline={setPollDeadline}
                          handleAddOption={handleAddOption}
                          handleRemoveOption={handleRemoveOption}
                          handleOptionChange={handleOptionChange}
                          handlePollSubmit={handlePollSubmit}
                          content={content}
                          setContent={setContent}
                          setShowDrawingModal={setShowDrawingModal}
                          textareaRef={textareaRef}
                          handlePost={handlePost}
                          loading={loading}
                          fileInputRef={fixedFileInputRef}
                          handleImageUpload={handleImageUpload}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* ホームに戻るボタン */}
                <div className="flex justify-center mt-4 mb-4">
                  <a
                    href="/home"
                    className="flex items-center gap-2 px-6 py-3 text-pink-600 font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f9a8d4 100%)',
                      boxShadow: '0 4px 15px rgba(253, 242, 248, 0.3)',
                      border: '2px solid #f9a8d4'
                    }}
                  >
                    <i className="fas fa-home text-lg"></i>
                    <span>ホーム</span>
                  </a>
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

      {/* お絵描き機能モーダル */}
      <DrawingModal
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        onSave={handleDrawingSave}
      />

      {/* 投稿詳細モーダル */}
      {mainPosts.map((mainPost, index) => {
        console.log(`モーダル表示チェック: mainPosts[${index}] =`, mainPost, `showMainModals[${index}] =`, showMainModals[index]);
        const shouldShow = showMainModals[index];
        console.log(`モーダル ${index} の表示判定:`, shouldShow);
        return shouldShow && (
          <div key={`main-${mainPost._id || index}`} className="fixed inset-0 z-50 animate-fadeIn pointer-events-none">
            <div className="bg-white rounded-lg border border-black shadow-xl max-w-sm w-full max-h-64 overflow-y-auto animate-fadeIn pointer-events-auto" style={{ position: 'fixed', backgroundColor: 'white', ...getModalPosition(index) }}>
              <div className="p-3" style={{ backgroundColor: 'white' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-purple-700">
                    {mainPost.postNumber}
                  </h3>
                  <button
                    onClick={() => handleCloseMainModal(index)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg font-light w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {new Date(mainPost.createdAt).toLocaleString()}
                </div>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words post-content" style={{ backgroundColor: 'white' }}>
                  {renderPostContent(mainPost.content)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ネストした投稿詳細モーダル */}
      {nestedPosts.map((nestedPost, index) => 
        showNestedModals[index] ? (
          <div key={`nested-${nestedPost._id || index}`} className="fixed inset-0 z-50 animate-fadeIn pointer-events-none">
            <div className="bg-white rounded-lg border border-black shadow-xl max-w-sm w-full max-h-64 overflow-y-auto animate-fadeIn pointer-events-auto" style={{ position: 'fixed', backgroundColor: 'white', ...getNestedModalPosition(index) }}>
              <div className="p-3" style={{ backgroundColor: 'white' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-purple-700">
                    {nestedPost.postNumber}
                  </h3>
                  <button
                    onClick={() => handleCloseNestedModal(index)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg font-light w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {new Date(nestedPost.createdAt).toLocaleString()}
                </div>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words post-content" style={{ backgroundColor: 'white' }}>
                  {renderNestedPostContent(nestedPost.content)}
                </div>
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}