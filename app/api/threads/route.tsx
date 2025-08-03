import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// スレッドIDを生成する関数
function generateThreadId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("pencha");
    const threads = await db.collection("threads").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(threads);
  } catch (error) {
    return NextResponse.json({ message: "スレッド取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { 
      title, 
      description, 
      name, 
      email, 
      sage, 
      showId, 
      forceId, 
      avoidSearch, 
      rejectNew, 
      voiceChat, 
      pollType, 
      mainColor 
    } = await req.json();
    
    if (!title || typeof title !== "string") {
      return NextResponse.json({ message: "タイトルが必要です" }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db("pencha");
    
    const threadId = generateThreadId();
    const newThread = {
      _id: new ObjectId(),
      threadId: threadId,
      title,
      description: description || "",
      name: name || "名無しさん",
      email: email || "",
      sage: sage || false,
      showId: showId || false,
      forceId: forceId || false,
      avoidSearch: avoidSearch || false,
      rejectNew: rejectNew || false,
      voiceChat: voiceChat || false,
      pollType: pollType || "",
      mainColor: mainColor || "black",
      createdAt: new Date().toISOString(),
    };
    
    // スレッドを保存
    const result = await db.collection("threads").insertOne(newThread);
    
    // スレッド作成者の投稿をpostsコレクションに保存
    const creatorPost = {
      content: description || "",
      threadId: threadId,
      postNumber: 1,
      userIp: "system",
      userAgent: "system",
      type: "thread_creator",
      createdAt: newThread.createdAt,
    };
    
    await db.collection("posts").insertOne(creatorPost);
    
    // 新スレッド通知を作成
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'new_thread',
          threadId: threadId,
          content: title,
          authorName: name || "名無しさん"
        })
      });
    } catch (notificationError) {
      console.error("通知作成エラー:", notificationError);
      // 通知エラーはスレッド作成の成功を妨げない
    }
    
    return NextResponse.json({ ...newThread, _id: newThread._id.toString() });
  } catch (error) {
    return NextResponse.json({ message: "スレッド作成に失敗しました" }, { status: 500 });
  }
}
