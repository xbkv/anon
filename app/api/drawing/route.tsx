import { NextResponse } from "next/server";
import sharp from "sharp";

// レート制限用のMap
const rateLimitMap = new Map<string, number[]>();

// セキュリティ設定
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_REQUESTS_PER_MINUTE = 10;
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const MAX_FILENAME_LENGTH = 50;

// Yay API設定
const YAY_HOST = process.env.YAY_HOST || "https://api.yay.space/";
const YAY_ACCESS_TOKEN = process.env.YAY_ACCESS_TOKEN || "";
const YAY_CDN_BASE = "https://cdn.yay.space/uploads/";

// IPアドレスを取得する関数
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || 
         realIP || 
         cfConnectingIP || 
         'unknown';
}

// レート制限チェック
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  
  // 1分前のリクエストを削除
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// ファイル名をサニタイズ
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .substring(0, MAX_FILENAME_LENGTH);
}

// base64データを検証
function validateBase64Image(base64Data: string): boolean {
  // データサイズチェック
  const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
  if (sizeInBytes > MAX_FILE_SIZE) {
    return false;
  }
  
  // 有効なbase64形式かチェック
  const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
  if (!base64Regex.test(base64Data)) {
    return false;
  }
  
  return true;
}

// ランダムなベース名を生成
const generateRandomBaseName = (length = 16) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};

// フォーマットされた日付を取得
const getFormattedDate = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 0-based indexを補正
    day: now.getDate(),
  };
};

// 画像サイズを取得
const getImageSize = async (buffer: Buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return [metadata.width, metadata.height];
  } catch (error) {
    console.error("Error getting image size:", error);
    return [0, 0];
  }
};

// サムネイル画像を500x500にリサイズ
const createThumbnail = async (buffer: Buffer) => {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(500, 500, { fit: "cover" })
      .toBuffer();
    
    return thumbnailBuffer;
  } catch (error) {
    console.error("Error creating thumbnail:", error);
    throw new Error("サムネイル作成に失敗しました");
  }
};

// Yayのpresigned URLを取得
async function getPresignedUrls(fileNames: string[]): Promise<{ url: string; filename: string }[]> {
  try {
    const query = fileNames.map((name) => `file_names[]=${encodeURIComponent(name)}`).join("&");
    const url = `${YAY_HOST}v1/buckets/presigned_urls?${query}`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${YAY_ACCESS_TOKEN}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch presigned URLs. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.presigned_urls || data.presigned_urls.length < fileNames.length) {
      throw new Error("No presigned URLs received");
    }

    return data.presigned_urls.map((item: any) => ({
      url: item.url,
      filename: item.filename,
    }));
  } catch (error) {
    console.error("Error fetching presigned URLs:", error);
    throw new Error("画像アップロード用URLの取得に失敗しました");
  }
}

// Yayのpresigned URLに画像をアップロード
async function uploadToPresignedUrl(buffer: Buffer, presignedUrl: string, contentType: string = "image/png"): Promise<void> {
  try {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image. Status: ${response.status}`);
    }

    console.log("Image uploaded successfully to Yay server");
  } catch (error) {
    console.error("Error uploading to presigned URL:", error);
    throw new Error("画像のアップロードに失敗しました");
  }
}

export async function POST(req: Request) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, message: "リクエストが多すぎます。しばらく待ってから再試行してください。" }, 
        { status: 429 }
      );
    }

    const { imageData, threadId } = await req.json();
    
    // 入力値の検証
    if (!imageData || !threadId) {
      return NextResponse.json(
        { success: false, message: "必要なデータが不足しています。" }, 
        { status: 400 }
      );
    }
    
    // threadIdの形式チェック
    if (typeof threadId !== 'string' || threadId.length > 100) {
      return NextResponse.json(
        { success: false, message: "無効なスレッドIDです。" }, 
        { status: 400 }
      );
    }
    
    // base64データの検証
    if (!validateBase64Image(imageData)) {
      return NextResponse.json(
        { success: false, message: "無効な画像データです。" }, 
        { status: 400 }
      );
    }
    
    // ファイル名を生成（参考の関数を使用）
    const { year, month, day } = getFormattedDate();
    const baseName = generateRandomBaseName();
    const timeStamp = Date.now();
    const size = "1080x1099";
    
    // メイン画像とサムネイル画像のファイル名を生成
    const mainFileName = `post/${year}/${month}/${day}/${baseName}_${timeStamp}_0_size_${size}.png`;
    const thumbFileName = `post/${year}/${month}/${day}/thumb_${baseName}_${timeStamp}_0_size_${size}.png`;
    
    // ファイル名の追加検証
    if (mainFileName.includes('..') || mainFileName.includes('\\') || 
        thumbFileName.includes('..') || thumbFileName.includes('\\')) {
      return NextResponse.json(
        { success: false, message: "無効なファイル名です。" }, 
        { status: 400 }
      );
    }
    
    // base64データをデコード
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // ファイルサイズの最終チェック
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "ファイルサイズが大きすぎます。" }, 
        { status: 400 }
      );
    }
    
    // サムネイル画像を作成
    const thumbnailBuffer = await createThumbnail(buffer);
    
    // Yayのpresigned URLを取得（メイン画像とサムネイル画像の両方）
    const presignedData = await getPresignedUrls([mainFileName, thumbFileName]);
    
    // メイン画像とサムネイル画像をアップロード
    await Promise.all([
      uploadToPresignedUrl(buffer, presignedData[0].url, "image/png"),
      uploadToPresignedUrl(thumbnailBuffer, presignedData[1].url, "image/png")
    ]);
    
    // 画像サイズを取得
    const imageSize = await getImageSize(buffer);
    
    // YayのCDN URLを構築（メイン画像のURLを返す）
    const imageUrl = `${YAY_CDN_BASE}${presignedData[0].filename}`;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: imageUrl,
      imageSize: imageSize,
      message: "描画が保存されました（メイン画像とサムネイル画像）" 
    });
    
  } catch (error) {
    console.error("描画保存エラー:", error);
    return NextResponse.json(
      { success: false, message: "描画の保存に失敗しました" }, 
      { status: 500 }
    );
  }
} 