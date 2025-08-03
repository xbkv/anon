import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("pencha");
    
    // 投稿単位でヘッドラインを取得（スレッド情報も含める）
    const headlines = await db.collection("posts").aggregate([
      {
        $lookup: {
          from: "threads",
          localField: "threadId",
          foreignField: "threadId",
          as: "thread"
        }
      },
      {
        $addFields: {
          threadTitle: { $arrayElemAt: ["$thread.title", 0] },
          threadId: "$threadId",
          // スレッドの投稿数を取得
          threadPostCount: { $size: { $ifNull: ["$thread", []] } }
        }
      },
      {
        // 画像投稿を除外（imgタグを含む投稿を除外）
        $match: {
          content: { $not: { $regex: /<img/i } }
        }
      },
      {
        $sort: {
          createdAt: -1 // 投稿時刻でソート（最新が上）
        }
      },
      {
        $limit: 30 // 最新30件の投稿
      },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          threadTitle: 1,
          threadId: 1,
          author: 1,
          threadPostCount: 1
        }
      }
    ]).toArray();

    console.log("=== ヘッドライン結果 ===");
    console.log("ヘッドライン取得結果（投稿単位）:", headlines.length, "件");
    if (headlines.length > 0) {
      console.log("最初のヘッドライン:", JSON.stringify(headlines[0], null, 2));
    }

    return NextResponse.json(headlines);
  } catch (error) {
    console.error("ヘッドライン取得エラー:", error);
    return NextResponse.json({ error: "ヘッドライン取得に失敗しました" }, { status: 500 });
  }
} 