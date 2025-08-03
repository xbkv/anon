import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("pencha");
    
    // テストユーザーを作成
    const testUser = {
      username: "testuser",
      password: "testpass123",
      createdAt: new Date().toISOString(),
    };
    
    // 既存のユーザーをチェック
    const existingUser = await db.collection("users").findOne({ 
      username: testUser.username 
    });
    
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "テストユーザーは既に存在します。",
        credentials: {
          username: testUser.username,
          password: testUser.password
        }
      });
    }
    
    // 新しいユーザーを作成
    await db.collection("users").insertOne(testUser);
    
    return NextResponse.json({
      success: true,
      message: "テストユーザーを作成しました。",
      credentials: {
        username: testUser.username,
        password: testUser.password
      }
    });
    
  } catch (error) {
    console.error("ユーザー作成エラー:", error);
    return NextResponse.json(
      { success: false, message: "ユーザー作成に失敗しました。" },
      { status: 500 }
    );
  }
} 