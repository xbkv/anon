import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("pencha");
    
    // コレクションの状態を確認
    const postsCount = await db.collection("posts").countDocuments();
    const threadsCount = await db.collection("threads").countDocuments();
    
    // 最新の投稿を取得
    const latestPosts = await db.collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    // 最新のスレッドを取得
    const latestThreads = await db.collection("threads")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    // ヘッドライン用のクエリをテスト
    const testHeadlines = await db.collection("posts").aggregate([
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
          threadId: "$threadId"
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 5
      }
    ]).toArray();

    // サンプル投稿の詳細情報
    const samplePost = latestPosts[0];
    const sampleThread = latestThreads[0];

    return NextResponse.json({
      postsCount,
      threadsCount,
      latestPosts: latestPosts.map(post => ({
        _id: post._id,
        content: post.content,
        threadId: post.threadId,
        author: post.author,
        createdAt: post.createdAt
      })),
      latestThreads: latestThreads.map(thread => ({
        _id: thread._id,
        title: thread.title,
        threadId: thread.threadId,
        createdAt: thread.createdAt
      })),
      testHeadlines: testHeadlines.map(headline => ({
        _id: headline._id,
        content: headline.content,
        threadTitle: headline.threadTitle,
        threadId: headline.threadId,
        author: headline.author,
        createdAt: headline.createdAt
      })),
      samplePost,
      sampleThread,
      message: "デバッグ情報"
    });
  } catch (error) {
    console.error("デバッグエラー:", error);
    return NextResponse.json({ error: "デバッグ情報の取得に失敗しました" }, { status: 500 });
  }
} 