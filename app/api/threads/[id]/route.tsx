import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("pencha");

    // threadIdとして検索を試行
    let thread = await db.collection("threads").findOne({ threadId: id });
    
    // threadIdで見つからない場合はObjectIdとして検索
    if (!thread) {
      try {
        thread = await db.collection("threads").findOne({ _id: new ObjectId(id) });
      } catch (error) {
        // ObjectIdで見つからない場合は文字列として検索
        thread = await db.collection("threads").findOne({ _id: id as any });
      }
    }
    
    if (!thread) {
      return NextResponse.json({ message: "スレッドが見つかりません" }, { status: 404 });
    }
    
    return NextResponse.json(thread);
  } catch (error) {
    console.error("スレッド取得エラー:", error);
    return NextResponse.json({ message: "スレッド取得に失敗しました" }, { status: 500 });
  }
} 