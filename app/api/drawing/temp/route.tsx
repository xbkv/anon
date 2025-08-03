import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAuthToken } from "../../auth/verify/route";

// 一時保存された画像の管理
interface TempImage {
  imageUrl: string;
  threadId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

export async function POST(req: Request) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "認証が必要です" }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const authResult = verifyAuthToken(token);
    
    if (!authResult.isValid) {
      return NextResponse.json(
        { success: false, message: "認証が無効です。再度認証してください。" }, 
        { status: 401 }
      );
    }

    const { imageUrl, threadId } = await req.json();
    
    if (!imageUrl || !threadId) {
      return NextResponse.json(
        { success: false, message: "画像URLとスレッドIDが必要です。" }, 
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    // 1分後の有効期限を設定
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000); // 1分後
    
    // 一時保存データを作成
    const tempImage: TempImage = {
      imageUrl: imageUrl,
      threadId: threadId,
      userId: authResult.userId!,
      createdAt: now,
      expiresAt: expiresAt,
      used: false
    };
    
    // DBに保存
    const result = await db.collection("temp_images").insertOne(tempImage);
    
    return NextResponse.json({
      success: true,
      tempImageId: result.insertedId,
      expiresAt: expiresAt,
      message: "画像が一時保存されました。1分間有効です。"
    });
    
  } catch (error) {
    console.error("一時保存エラー:", error);
    return NextResponse.json(
      { success: false, message: "一時保存に失敗しました" }, 
      { status: 500 }
    );
  }
}

// 一時保存された画像を取得（有効期限内のみ）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const userId = searchParams.get("userId");
    
    if (!threadId || !userId) {
      return NextResponse.json(
        { success: false, message: "スレッドIDとユーザーIDが必要です。" }, 
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    // 有効期限内で未使用の画像を取得
    const now = new Date();
    const tempImages = await db.collection("temp_images").find({
      threadId: threadId,
      userId: userId,
      expiresAt: { $gt: now },
      used: false
    }).toArray();
    
    return NextResponse.json({
      success: true,
      tempImages: tempImages
    });
    
  } catch (error) {
    console.error("一時保存取得エラー:", error);
    return NextResponse.json(
      { success: false, message: "一時保存の取得に失敗しました" }, 
      { status: 500 }
    );
  }
}

// 画像を使用済みにマーク
export async function PUT(req: Request) {
  try {
    const { tempImageId } = await req.json();
    
    if (!tempImageId) {
      return NextResponse.json(
        { success: false, message: "一時保存IDが必要です。" }, 
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    
    // 画像を使用済みにマーク
    await db.collection("temp_images").updateOne(
      { _id: tempImageId },
      { $set: { used: true } }
    );
    
    return NextResponse.json({
      success: true,
      message: "画像が使用済みにマークされました。"
    });
    
  } catch (error) {
    console.error("使用済みマークエラー:", error);
    return NextResponse.json(
      { success: false, message: "使用済みマークに失敗しました" }, 
      { status: 500 }
    );
  }
} 