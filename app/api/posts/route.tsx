import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// 強化されたレート制限
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const MAX_REQUESTS_PER_WINDOW = process.env.NODE_ENV === 'development' ? 100 : 30; // 開発環境では100回、本番では30回

// APIキー認証
const VALID_API_KEYS = process.env.VALID_API_KEYS?.split(',') || [];
const REQUIRE_API_KEY = process.env.NODE_ENV === 'production';

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    // 新しいウィンドウを開始
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // 制限超過
  }
  
  // カウントを増加
  userLimit.count++;
  return true;
}

function validateApiKey(req: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true; // 開発環境では常に許可
  
  if (!REQUIRE_API_KEY) return true; // 本番環境でも設定されていない場合は許可
  
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return false;
  
  return VALID_API_KEYS.includes(apiKey);
}

function getIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";
}
function getUserToken(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/user_token=([^;]+)/);
  return match ? match[1] : null;
}

const lastPostMap = new Map(); // key: ip|userToken, value: lastPostTime
const NG_WORDS = ["死ね", "殺す", "spam", "http://badsite", "https://badsite"];
const URL_REGEX = /https?:\/\//i;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    const skip = (page - 1) * limit;
    
    const posts = await db.collection("posts")
      .find({ threadId: threadId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPosts = await db.collection("posts").countDocuments({ threadId: threadId });
    
    return NextResponse.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNextPage: page * limit < totalPosts,
        hasPrevPage: page > 1
      }
    });
  } catch {
    console.error("投稿取得エラー");
    return NextResponse.json({ error: "投稿の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, threadId, author } = body;
    
    if (!content || !threadId) {
      return NextResponse.json({ error: "content and threadId are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    // 投稿番号を取得
    const lastPost = await db.collection("posts")
      .find({ threadId: threadId })
      .sort({ postNumber: -1 })
      .limit(1)
      .toArray();
    
    const postNumber = lastPost.length > 0 ? lastPost[0].postNumber + 1 : 1;
    
    const post = {
      content,
      threadId,
      author: author || "匿名",
      postNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("posts").insertOne(post);
    
    return NextResponse.json({ 
      success: true, 
      post: { ...post, _id: result.insertedId } 
    });
  } catch {
    console.error("投稿作成エラー");
    return NextResponse.json({ error: "投稿の作成に失敗しました" }, { status: 500 });
  }
} 