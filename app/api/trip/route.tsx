import { NextResponse } from "next/server";
import crypto from "crypto";

// トリップ生成関数（5ch風）
function generateTrip(input: string): string {
  // 入力文字列をShift_JISとして扱う（簡易実装）
  const salt = (input + "H.").substring(1, 3);
  const saltChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./";
  
  // 簡易的なsalt生成
  let saltValue = 0;
  for (let i = 0; i < salt.length; i++) {
    saltValue += salt.charCodeAt(i);
  }
  const saltChar = saltChars[saltValue % saltChars.length];
  
  // トリップ生成（簡易版）
  const tripInput = input + saltChar;
  const hash = crypto.createHash('sha1').update(tripInput).digest('hex');
  
  // 10文字のトリップを生成
  let trip = "";
  for (let i = 0; i < 10; i++) {
    const charCode = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
    trip += saltChars[charCode % saltChars.length];
  }
  
  return trip;
}

// 名前とトリップを解析
function parseNameAndTrip(input: string): { name: string; trip: string | null } {
  const tripMatch = input.match(/^(.*?)(?:#(.+))?$/);
  
  if (!tripMatch) {
    return { name: input, trip: null };
  }
  
  const name = tripMatch[1] || "名無しさん";
  const tripPassword = tripMatch[2];
  
  if (!tripPassword) {
    return { name, trip: null };
  }
  
  const trip = generateTrip(tripPassword);
  return { name, trip };
}

// トリップ生成
export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();
    
    if (!name || !password) {
      return NextResponse.json({ message: "名前とパスワードが必要です" }, { status: 400 });
    }

    const trip = generateTrip(password);
    const displayName = `${name}#${password}`;
    const tripDisplay = `◆${trip}`;

    return NextResponse.json({
      success: true,
      originalName: name,
      displayName,
      trip,
      tripDisplay,
      fullDisplay: `${name}◆${trip}`
    });

  } catch (error) {
    console.error("トリップ生成エラー:", error);
    return NextResponse.json({ message: "トリップ生成に失敗しました" }, { status: 500 });
  }
}

// 名前解析
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");
    
    if (!input) {
      return NextResponse.json({ message: "入力文字列が必要です" }, { status: 400 });
    }

    const { name, trip } = parseNameAndTrip(input);
    
    if (!trip) {
      return NextResponse.json({
        success: true,
        name,
        trip: null,
        displayName: name
      });
    }

    return NextResponse.json({
      success: true,
      name,
      trip,
      displayName: `${name}◆${trip}`,
      tripDisplay: `◆${trip}`
    });

  } catch (error) {
    console.error("名前解析エラー:", error);
    return NextResponse.json({ message: "名前解析に失敗しました" }, { status: 500 });
  }
}

// トリップ検証
export async function PUT(req: Request) {
  try {
    const { name, password, expectedTrip } = await req.json();
    
    if (!name || !password || !expectedTrip) {
      return NextResponse.json({ message: "名前、パスワード、期待されるトリップが必要です" }, { status: 400 });
    }

    const generatedTrip = generateTrip(password);
    const isValid = generatedTrip === expectedTrip;

    return NextResponse.json({
      success: true,
      isValid,
      generatedTrip,
      expectedTrip,
      match: isValid
    });

  } catch (error) {
    console.error("トリップ検証エラー:", error);
    return NextResponse.json({ message: "トリップ検証に失敗しました" }, { status: 500 });
  }
} 