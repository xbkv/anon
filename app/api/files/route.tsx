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

// ファイル一覧取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const admin = searchParams.get("admin") === "true";

    // 管理者認証チェック
    if (admin && !validateAdminAuth(req)) {
      return NextResponse.json({ message: "管理者認証が必要です" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    let query: any = {};
    
    if (threadId) {
      query.threadId = threadId;
    }
    
    if (type) {
      query.type = type;
    }

    // 管理者以外は削除されていないファイルのみ
    if (!admin) {
      query.deleted = { $ne: true };
    }

    const skip = (page - 1) * limit;
    
    const files = await db.collection("files")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalFiles = await db.collection("files").countDocuments(query);

    return NextResponse.json({
      files,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFiles / limit),
        totalFiles,
        filesPerPage: limit
      }
    });

  } catch (error) {
    console.error("ファイル一覧取得エラー:", error);
    return NextResponse.json({ message: "ファイル一覧取得に失敗しました" }, { status: 500 });
  }
}

// ファイル情報更新
export async function PUT(req: Request) {
  try {
    const { fileId, threadId, description, tags } = await req.json();
    
    if (!fileId) {
      return NextResponse.json({ message: "ファイルIDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    const updateData: any = {};
    
    if (threadId) updateData.threadId = threadId;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    
    updateData.updatedAt = new Date().toISOString();

    const result = await db.collection("files").updateOne(
      { _id: new ObjectId(fileId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "ファイルが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "ファイル情報を更新しました" 
    });

  } catch (error) {
    console.error("ファイル更新エラー:", error);
    return NextResponse.json({ message: "ファイル更新に失敗しました" }, { status: 500 });
  }
}

// ファイル削除（論理削除）
export async function DELETE(req: Request) {
  try {
    const { fileId, reason } = await req.json();
    
    if (!fileId) {
      return NextResponse.json({ message: "ファイルIDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // ファイルを論理削除
    const result = await db.collection("files").updateOne(
      { _id: new ObjectId(fileId) },
      { 
        $set: { 
          deleted: true, 
          deletedAt: new Date().toISOString(),
          deleteReason: reason || "管理者による削除"
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "ファイルが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "ファイルを削除しました" 
    });

  } catch (error) {
    console.error("ファイル削除エラー:", error);
    return NextResponse.json({ message: "ファイル削除に失敗しました" }, { status: 500 });
  }
}

// ファイル統計情報
export async function PATCH(req: Request) {
  try {
    const { action } = await req.json();
    
    if (action !== "stats") {
      return NextResponse.json({ message: "無効なアクションです" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // 統計情報を取得
    const totalFiles = await db.collection("files").countDocuments({});
    const activeFiles = await db.collection("files").countDocuments({ deleted: { $ne: true } });
    const deletedFiles = await db.collection("files").countDocuments({ deleted: true });

    // ファイルタイプ別統計
    const typeStats = await db.collection("files").aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]).toArray();

    // スレッド別ファイル数
    const threadStats = await db.collection("files").aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$threadId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // 最近のアップロード
    const recentUploads = await db.collection("files")
      .find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      stats: {
        totalFiles,
        activeFiles,
        deletedFiles,
        typeStats,
        threadStats,
        recentUploads
      }
    });

  } catch (error) {
    console.error("統計情報取得エラー:", error);
    return NextResponse.json({ message: "統計情報取得に失敗しました" }, { status: 500 });
  }
} 