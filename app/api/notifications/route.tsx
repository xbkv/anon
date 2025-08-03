import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// 通知タイプの定義
type NotificationType = 
  | "new_post" 
  | "new_thread" 
  | "mention" 
  | "thread_update" 
  | "moderation";

// 通知を作成する関数
async function createNotification(
  db: any,
  type: NotificationType,
  data: any,
  targetThreadId?: string
) {
  const notification = {
    type,
    data,
    targetThreadId,
    createdAt: new Date().toISOString(),
    read: false
  };

  await db.collection("notifications").insertOne(notification);
}

// メンション検出関数
function extractMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// 新着投稿通知
export async function POST(req: Request) {
  try {
    const { type, threadId, postId, content, authorName } = await req.json();
    
    if (!type || !threadId) {
      return NextResponse.json({ message: "通知タイプとスレッドIDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    if (type === "new_post") {
      // 新着投稿通知
      const mentions = extractMentions(content);
      
      // メンション通知を作成
      for (const mention of mentions) {
        await createNotification(db, "mention", {
          postId,
          threadId,
          content: content.substring(0, 100) + "...",
          authorName,
          mention
        }, threadId);
      }

      // スレッド更新通知（新着投稿）
      await createNotification(db, "thread_update", {
        postId,
        threadId,
        content: content.substring(0, 100) + "...",
        authorName,
        updateType: "new_post"
      }, threadId);

    } else if (type === "new_thread") {
      // 新スレッド通知
      await createNotification(db, "new_thread", {
        threadId,
        title: content,
        authorName
      });

    } else if (type === "moderation") {
      // モデレーション通知
      await createNotification(db, "moderation", {
        threadId,
        action: content,
        reason: authorName
      }, threadId);
    }

    return NextResponse.json({ 
      success: true, 
      message: "通知を作成しました" 
    });

  } catch (error) {
    console.error("通知作成エラー:", error);
    return NextResponse.json({ message: "通知作成に失敗しました" }, { status: 500 });
  }
}

// 通知取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unread") === "true";

    const client = await clientPromise;
    const db = client.db("pencha");

    let query: any = {};
    
    if (threadId) {
      query.targetThreadId = threadId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await db.collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error("通知取得エラー:", error);
    return NextResponse.json({ message: "通知取得に失敗しました" }, { status: 500 });
  }
}

// 通知を既読にする
export async function PATCH(req: Request) {
  try {
    const { notificationId, threadId } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("pencha");

    let query: any = {};
    
    if (notificationId) {
      query._id = new ObjectId(notificationId);
    } else if (threadId) {
      query.targetThreadId = threadId;
    } else {
      return NextResponse.json({ message: "通知IDまたはスレッドIDが必要です" }, { status: 400 });
    }

    const result = await db.collection("notifications").updateMany(
      query,
      { $set: { read: true, readAt: new Date().toISOString() } }
    );

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.modifiedCount,
      message: `${result.modifiedCount}件の通知を既読にしました` 
    });

  } catch (error) {
    console.error("通知既読エラー:", error);
    return NextResponse.json({ message: "通知既読に失敗しました" }, { status: 500 });
  }
}

// 古い通知を削除
export async function DELETE(req: Request) {
  try {
    const { days = 30 } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("pencha");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.collection("notifications").deleteMany({
      createdAt: { $lt: cutoffDate.toISOString() }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `${result.deletedCount}件の古い通知を削除しました` 
    });

  } catch (error) {
    console.error("通知削除エラー:", error);
    return NextResponse.json({ message: "通知削除に失敗しました" }, { status: 500 });
  }
} 