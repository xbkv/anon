import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const query = searchParams.get("query");
    const postNumber = searchParams.get("postNumber");
    
    console.log('Search API called with:', { threadId, query, postNumber });

    // 投稿番号による検索（既存機能）
    if (postNumber) {
      const postNum = parseInt(postNumber);
      if (!threadId || !postNum) {
        return NextResponse.json({ message: "スレッドIDと投稿番号が必要です" }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db("pencha");
      
      const post = await db.collection("posts").findOne({
        threadId: threadId,
        postNumber: postNum
      });

      if (!post) {
        return NextResponse.json({ message: "投稿が見つかりません" }, { status: 404 });
      }

      // セキュリティ強化: 機密情報を除外
      const sanitizedPost = {
        _id: post._id,
        content: post.content,
        threadId: post.threadId,
        postNumber: post.postNumber,
        type: post.type,
        createdAt: post.createdAt
        // userIp, userAgent等の機密情報は除外
      };

      return NextResponse.json(sanitizedPost);
    }
    
    // クエリによる検索（新機能）
    if (!threadId || !query) {
      console.error('Missing required parameters:', { threadId, query });
      return NextResponse.json({ error: 'threadId and query are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    const postsCollection = db.collection("posts");

    console.log('Searching for posts with:', { threadId, query });

    // 全スレッドから検索クエリにマッチする投稿を取得
    const searchResults = await postsCollection
      .find({
        threadId: threadId,
        content: { $regex: query, $options: 'i' } // 大文字小文字を区別しない
      })
      .sort({ postNumber: 1 }) // 投稿番号順にソート
      .limit(50)
      .toArray();

    console.log('Search results count:', searchResults.length);

    // セキュリティ強化: 機密情報を除外
    const sanitizedSearchResults = searchResults.map(post => ({
      _id: post._id,
      content: post.content,
      threadId: post.threadId,
      postNumber: post.postNumber,
      type: post.type,
      createdAt: post.createdAt
      // userIp, userAgent等の機密情報は除外
    }));

    // 総件数を取得
    const totalCount = await postsCollection.countDocuments({
      threadId: threadId,
      content: { $regex: query, $options: 'i' }
    });

    console.log('Total count:', totalCount);

    return NextResponse.json({
      posts: sanitizedSearchResults,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(totalCount / 50),
        totalPosts: totalCount,
        postsPerPage: 50
      }
    });

  } catch (error) {
    console.error("検索エラー:", error);
    return NextResponse.json({ message: "検索に失敗しました" }, { status: 500 });
  }
} 