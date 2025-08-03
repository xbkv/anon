import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// 管理者認証（環境変数で設定）
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "admin_secret_key_2024";

// 管理者認証チェック
function validateAdminAuth(req: Request): boolean {
  const apiKey = req.headers.get('x-admin-key');
  return apiKey === ADMIN_API_KEY;
}

// 投稿削除
export async function DELETE(req: Request) {
  try {
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const { postId, threadId, reason } = await req.json();
    
    if (!postId || !threadId) {
      return NextResponse.json({ message: "投稿IDとスレッドIDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // 投稿を削除（論理削除）
    const result = await db.collection("posts").updateOne(
      { _id: new ObjectId(postId), threadId: threadId },
      { 
        $set: { 
          deleted: true, 
          deletedAt: new Date().toISOString(),
          deleteReason: reason || "管理者による削除"
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "投稿が見つかりません" }, { status: 404 });
    }

    // 削除ログを記録
    await db.collection("moderation_logs").insertOne({
      action: "post_delete",
      postId: postId,
      threadId: threadId,
      reason: reason || "管理者による削除",
      adminKey: req.headers.get('x-admin-key'),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: "投稿を削除しました" 
    });

  } catch (error) {
    console.error("投稿削除エラー:", error);
    return NextResponse.json({ message: "投稿削除に失敗しました" }, { status: 500 });
  }
}

// スレッド削除
export async function PUT(req: Request) {
  try {
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const { threadId, reason } = await req.json();
    
    if (!threadId) {
      return NextResponse.json({ message: "スレッドIDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // スレッドを削除（論理削除）
    const result = await db.collection("threads").updateOne(
      { threadId: threadId },
      { 
        $set: { 
          deleted: true, 
          deletedAt: new Date().toISOString(),
          deleteReason: reason || "管理者による削除"
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "スレッドが見つかりません" }, { status: 404 });
    }

    // 削除ログを記録
    await db.collection("moderation_logs").insertOne({
      action: "thread_delete",
      threadId: threadId,
      reason: reason || "管理者による削除",
      adminKey: req.headers.get('x-admin-key'),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: "スレッドを削除しました" 
    });

  } catch (error) {
    console.error("スレッド削除エラー:", error);
    return NextResponse.json({ message: "スレッド削除に失敗しました" }, { status: 500 });
  }
}

// IP BAN管理
export async function POST(req: Request) {
  try {
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const { action, ip, reason, duration } = await req.json();
    
    if (!action || !ip) {
      return NextResponse.json({ message: "アクションとIPアドレスが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    if (action === "ban") {
      // IP BAN追加
      const banExpiresAt = duration ? new Date(Date.now() + duration * 1000) : null;
      
      await db.collection("ip_bans").insertOne({
        ip: ip,
        reason: reason || "管理者によるBAN",
        bannedAt: new Date().toISOString(),
        expiresAt: banExpiresAt?.toISOString(),
        adminKey: req.headers.get('x-admin-key')
      });

      // BANログを記録
      await db.collection("moderation_logs").insertOne({
        action: "ip_ban",
        ip: ip,
        reason: reason || "管理者によるBAN",
        duration: duration,
        adminKey: req.headers.get('x-admin-key'),
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ 
        success: true, 
        message: "IPをBANしました" 
      });

    } else if (action === "unban") {
      // IP BAN解除
      const result = await db.collection("ip_bans").deleteOne({ ip: ip });

      if (result.deletedCount === 0) {
        return NextResponse.json({ message: "BANされていないIPです" }, { status: 404 });
      }

      // 解除ログを記録
      await db.collection("moderation_logs").insertOne({
        action: "ip_unban",
        ip: ip,
        adminKey: req.headers.get('x-admin-key'),
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ 
        success: true, 
        message: "IP BANを解除しました" 
      });
    }

    return NextResponse.json({ message: "無効なアクションです" }, { status: 400 });

  } catch (error) {
    console.error("BAN管理エラー:", error);
    return NextResponse.json({ message: "BAN管理に失敗しました" }, { status: 500 });
  }
}

// NGワード管理
export async function PATCH(req: Request) {
  try {
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const { action, word, reason } = await req.json();
    
    if (!action || !word) {
      return NextResponse.json({ message: "アクションとNGワードが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    if (action === "add") {
      // NGワード追加
      await db.collection("ng_words").insertOne({
        word: word,
        reason: reason || "管理者による追加",
        addedAt: new Date().toISOString(),
        adminKey: req.headers.get('x-admin-key')
      });

      return NextResponse.json({ 
        success: true, 
        message: "NGワードを追加しました" 
      });

    } else if (action === "remove") {
      // NGワード削除
      const result = await db.collection("ng_words").deleteOne({ word: word });

      if (result.deletedCount === 0) {
        return NextResponse.json({ message: "NGワードが見つかりません" }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "NGワードを削除しました" 
      });
    }

    return NextResponse.json({ message: "無効なアクションです" }, { status: 400 });

  } catch (error) {
    console.error("NGワード管理エラー:", error);
    return NextResponse.json({ message: "NGワード管理に失敗しました" }, { status: 500 });
  }
}

// モデレーション情報取得
export async function GET(req: Request) {
  try {
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const client = await clientPromise;
    const db = client.db("pencha");

    if (type === "bans") {
      // BANされたIP一覧
      const bans = await db.collection("ip_bans").find({}).toArray();
      return NextResponse.json({ bans });

    } else if (type === "ng_words") {
      // NGワード一覧
      const ngWords = await db.collection("ng_words").find({}).toArray();
      return NextResponse.json({ ngWords });

    } else if (type === "logs") {
      // モデレーションログ
      const logs = await db.collection("moderation_logs")
        .find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      return NextResponse.json({ logs });

    } else {
      // 全情報
      const bans = await db.collection("ip_bans").find({}).toArray();
      const ngWords = await db.collection("ng_words").find({}).toArray();
      const logs = await db.collection("moderation_logs")
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({ bans, ngWords, logs });
    }

  } catch (error) {
    console.error("モデレーション情報取得エラー:", error);
    return NextResponse.json({ message: "情報取得に失敗しました" }, { status: 500 });
  }
} 