import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const pre = parseInt(searchParams.get('pre') || '0');
    const now = parseInt(searchParams.get('now') || '0');
    const { threadId } = await params;
    
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    if (pre < 0 || now < 0) {
      return NextResponse.json({ error: "pre and now must be non-negative" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    let posts: any[] = [];
    let totalPosts: number;
    
    // pre=0&now=0の場合は最新投稿番号のみを取得
    if (pre === 0 && now === 0) {
      const latestPost = await db.collection("posts")
        .find({ threadId: threadId })
        .sort({ postNumber: -1 })
        .limit(1)
        .toArray();
      
      const latestPostNumber = latestPost.length > 0 ? latestPost[0].postNumber : 0;
      totalPosts = await db.collection("posts").countDocuments({ threadId: threadId });
      
      return NextResponse.json({
        latestPostNumber,
        totalPosts,
        hasNewPosts: latestPostNumber > 0
      });
    }
    
    // preからnowまでの投稿を取得
    if (pre > 0 && now > 0) {
      posts = await db.collection("posts")
        .find({ 
          threadId: threadId,
          postNumber: { $gt: pre, $lte: now }
        })
        .sort({ postNumber: 1 })
        .toArray();
      
      totalPosts = await db.collection("posts").countDocuments({ threadId: threadId });
    } else {
      // その他の場合は空の結果を返す
      posts = [];
      totalPosts = await db.collection("posts").countDocuments({ threadId: threadId });
    }
    
    return NextResponse.json({
      posts,
      pagination: {
        totalPosts,
        hasNewPosts: posts.length > 0
      }
    });
  } catch (error) {
    console.error("投稿取得エラー:", error);
    return NextResponse.json({ error: "投稿の取得に失敗しました" }, { status: 500 });
  }
} 