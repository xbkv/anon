import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// 最新投稿取得（GET）
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("berubo");
    const posts = await db.collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ message: "投稿の取得に失敗しました" }, { status: 500 });
  }
}

// 投稿作成（POST）
export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ message: "本文が必要です" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db("berubo");
    const newPost = {
      content,
      createdAt: new Date().toISOString(),
      threadId: "main", // 今は全投稿共通、将来スレッド分割可
    };
    const result = await db.collection("posts").insertOne(newPost);
    return NextResponse.json({ ...newPost, _id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ message: "投稿に失敗しました" }, { status: 500 });
  }
} 