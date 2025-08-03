import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("pencha");
    
    const now = new Date();
    
    // 有効期限切れの一時保存画像を削除
    const result = await db.collection("temp_images").deleteMany({
      expiresAt: { $lt: now }
    });
    
    console.log(`クリーンアップ完了: ${result.deletedCount}件の古い一時保存データを削除しました`);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount}件の古い一時保存データを削除しました`
    });
    
  } catch (error) {
    console.error("クリーンアップエラー:", error);
    return NextResponse.json(
      { success: false, message: "クリーンアップに失敗しました" },
      { status: 500 }
    );
  }
} 