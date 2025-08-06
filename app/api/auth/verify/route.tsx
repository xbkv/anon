import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// 認証セッション管理用のMap
const authSessions = new Map<string, { userId: string; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "ユーザー名とパスワードを入力してください。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    // ユーザーを検索（簡易的な認証）
    const user = await db.collection("users").findOne({ 
      username: username,
      password: password // 実際の運用ではハッシュ化すべき
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "ユーザー名またはパスワードが正しくありません。" },
        { status: 401 }
      );
    }

    // 認証トークンを生成
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    // 有効時間を1分に設定
    const expiresAt = Date.now() + (60 * 1000); // 1分
    
    // セッションを保存
    authSessions.set(token, {
      userId: user._id.toString(),
      expiresAt: expiresAt
    });

    return NextResponse.json({
      success: true,
      token: token,
      expiresAt: expiresAt,
      message: "認証に成功しました。1分間有効です。"
    });

  } catch (error) {
    console.error("認証エラー:", error);
    return NextResponse.json(
      { success: false, message: "認証に失敗しました。" },
      { status: 500 }
    );
  }
}

// 認証トークンを検証する関数（他のAPIで使用）
export function verifyAuthToken(token: string): { isValid: boolean; userId?: string } {
  const session = authSessions.get(token);
  
  if (!session) {
    return { isValid: false };
  }
  
  // 有効期限チェック
  if (Date.now() > session.expiresAt) {
    authSessions.delete(token);
    return { isValid: false };
  }
  
  return { isValid: true, userId: session.userId };
}

// 古いセッションをクリーンアップする関数
export function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of authSessions.entries()) {
    if (now > session.expiresAt) {
      authSessions.delete(token);
    }
  }
} 