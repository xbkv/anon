import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// 投票タイプの定義
type VoteType = "single" | "multiple" | "rating";

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

// 投票作成
export async function POST(req: Request) {
  try {
    const { threadId, title, options, type = "single", allowMultiple = false, expiresAt } = await req.json();
    
    if (!threadId || !title || !options || options.length < 2) {
      return NextResponse.json({ message: "スレッドID、タイトル、選択肢（2つ以上）が必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // 投票データを作成
    const vote = {
      threadId,
      title,
      options: options.map((option: string, index: number) => ({
        id: index + 1,
        text: option,
        votes: 0
      })),
      type,
      allowMultiple,
      totalVotes: 0,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      active: true
    };

    const result = await db.collection("votes").insertOne(vote);

    return NextResponse.json({ 
      success: true, 
      voteId: result.insertedId.toString(),
      message: "投票を作成しました" 
    });

  } catch (error) {
    console.error("投票作成エラー:", error);
    return NextResponse.json({ message: "投票作成に失敗しました" }, { status: 500 });
  }
}

// 投票実行
export async function PUT(req: Request) {
  try {
    const { voteId, selectedOptions } = await req.json();
    
    if (!voteId || !selectedOptions || !Array.isArray(selectedOptions)) {
      return NextResponse.json({ message: "投票IDと選択肢が必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");
    const ip = getClientIP(req);

    // 投票データを取得
    const vote = await db.collection("votes").findOne({ _id: new ObjectId(voteId) });
    
    if (!vote) {
      return NextResponse.json({ message: "投票が見つかりません" }, { status: 404 });
    }

    if (!vote.active) {
      return NextResponse.json({ message: "投票は終了しています" }, { status: 400 });
    }

    if (vote.expiresAt && new Date() > new Date(vote.expiresAt)) {
      return NextResponse.json({ message: "投票は期限切れです" }, { status: 400 });
    }

    // 既に投票済みかチェック
    const existingVote = await db.collection("vote_records").findOne({
      voteId: voteId,
      ip: ip
    });

    if (existingVote && !vote.allowMultiple) {
      return NextResponse.json({ message: "既に投票済みです" }, { status: 400 });
    }

    // 投票記録を作成
    await db.collection("vote_records").insertOne({
      voteId: voteId,
      ip: ip,
      selectedOptions,
      votedAt: new Date().toISOString()
    });

    // 投票数を更新
    const updateData: any = { $inc: { totalVotes: 1 } };
    
    for (const optionId of selectedOptions) {
      updateData.$inc[`options.${optionId - 1}.votes`] = 1;
    }

    await db.collection("votes").updateOne(
      { _id: new ObjectId(voteId) },
      updateData
    );

    return NextResponse.json({ 
      success: true, 
      message: "投票しました" 
    });

  } catch (error) {
    console.error("投票実行エラー:", error);
    return NextResponse.json({ message: "投票に失敗しました" }, { status: 500 });
  }
}

// 投票結果取得
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const voteId = searchParams.get("voteId");
    const threadId = searchParams.get("threadId");

    const client = await clientPromise;
    const db = client.db("pencha");

    if (voteId) {
      // 特定の投票結果を取得
      const vote = await db.collection("votes").findOne({ _id: new ObjectId(voteId) });
      
      if (!vote) {
        return NextResponse.json({ message: "投票が見つかりません" }, { status: 404 });
      }

      // 投票者のIPを取得（自分の投票状況を確認）
      const ip = getClientIP(req);
      const userVote = await db.collection("vote_records").findOne({
        voteId: voteId,
        ip: ip
      });

      return NextResponse.json({
        vote,
        userVoted: !!userVote,
        userSelection: userVote?.selectedOptions || []
      });

    } else if (threadId) {
      // スレッド内の全投票を取得
      const votes = await db.collection("votes")
        .find({ threadId: threadId })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({ votes });

    } else {
      // 全投票を取得
      const votes = await db.collection("votes")
        .find({ active: true })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({ votes });
    }

  } catch (error) {
    console.error("投票結果取得エラー:", error);
    return NextResponse.json({ message: "投票結果取得に失敗しました" }, { status: 500 });
  }
}

// 投票終了
export async function PATCH(req: Request) {
  try {
    const { voteId, action } = await req.json();
    
    if (!voteId || !action) {
      return NextResponse.json({ message: "投票IDとアクションが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    if (action === "end") {
      // 投票を終了
      const result = await db.collection("votes").updateOne(
        { _id: new ObjectId(voteId) },
        { $set: { active: false, endedAt: new Date().toISOString() } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ message: "投票が見つかりません" }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "投票を終了しました" 
      });

    } else if (action === "extend") {
      // 投票期限を延長
      const { newExpiresAt } = await req.json();
      
      if (!newExpiresAt) {
        return NextResponse.json({ message: "新しい期限が必要です" }, { status: 400 });
      }

      const result = await db.collection("votes").updateOne(
        { _id: new ObjectId(voteId) },
        { $set: { expiresAt: new Date(newExpiresAt).toISOString() } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ message: "投票が見つかりません" }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "投票期限を延長しました" 
      });
    }

    return NextResponse.json({ message: "無効なアクションです" }, { status: 400 });

  } catch (error) {
    console.error("投票管理エラー:", error);
    return NextResponse.json({ message: "投票管理に失敗しました" }, { status: 500 });
  }
}

// 投票削除
export async function DELETE(req: Request) {
  try {
    const { voteId } = await req.json();
    
    if (!voteId) {
      return NextResponse.json({ message: "投票IDが必要です" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("pencha");

    // 投票と投票記録を削除
    await db.collection("votes").deleteOne({ _id: new ObjectId(voteId) });
    await db.collection("vote_records").deleteMany({ voteId: voteId });

    return NextResponse.json({ 
      success: true, 
      message: "投票を削除しました" 
    });

  } catch (error) {
    console.error("投票削除エラー:", error);
    return NextResponse.json({ message: "投票削除に失敗しました" }, { status: 500 });
  }
} 