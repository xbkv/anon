import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("berubo");
    const threads = await db.collection("threads").find({}).toArray();

    return NextResponse.json(threads);
  } catch (error) {
    console.error("スレッドの取得に失敗しました:", error);
    return NextResponse.json(
      { message: "スレッドの取得に失敗しました" },
      { status: 500 }
    );
  }
}
