import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '40');

  if (!threadId) {
    return new NextResponse('Thread ID is required', { status: 400 });
  }

  try {
    const response = new NextResponse(
      new ReadableStream({
        start(controller) {
          let isControllerClosed = false;

          const sendData = (data: any) => {
            try {
              if (isControllerClosed) {
                console.log('SSEコントローラーは既に閉じられています');
                return;
              }
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch (error) {
              console.error('SSE送信エラー:', error);
              isControllerClosed = true;
            }
          };

          const checkForUpdates = async () => {
            try {
              if (isControllerClosed) {
                console.log('SSEコントローラーが閉じられているため、更新を停止します');
                return;
              }

              const client = await clientPromise;
              const db = client.db("pencha");
              const collection = db.collection("posts");

              // SSEでは最新の投稿を監視（新しい投稿があるかチェック）
              // 最新の投稿番号を取得
              const latestPost = await collection
                .find({ threadId: threadId })
                .sort({ postNumber: -1, createdAt: -1 })
                .limit(1)
                .toArray();
              
              let latestPosts: any[] = [];
              if (latestPost.length > 0) {
                const latestPostNumber = latestPost[0].postNumber;
                const startPostNumber = Math.max(1, latestPostNumber - 39); // 最新40件を取得
                
                latestPosts = await collection
                  .find({ 
                    threadId: threadId,
                    postNumber: { $gte: startPostNumber, $lte: latestPostNumber }
                  })
                  .sort({ postNumber: 1, createdAt: 1 })
                  .toArray();
              }

              const totalPosts = await collection.countDocuments({ threadId: threadId });
              const totalPages = Math.ceil(totalPosts / limit);

              // DOMPurifyを使わずにシンプルに処理
              const sanitizedPosts = latestPosts.map(post => ({
                ...post,
                content: post.content || ''
              }));

              sendData({
                type: 'update',
                posts: sanitizedPosts,
                pagination: {
                  currentPage: 1,
                  totalPages: totalPages,
                  totalPosts: totalPosts
                }
              });
            } catch (error) {
              console.error('SSE更新エラー:', error);
              if (!isControllerClosed) {
                sendData({
                  type: 'error',
                  message: '更新エラーが発生しました'
                });
              }
            }
          };

          // 初回実行
          checkForUpdates();
          
          // 2秒間隔で更新（よりリアルタイムに）
          const interval = setInterval(() => {
            if (!isControllerClosed) {
              checkForUpdates();
            } else {
              clearInterval(interval);
            }
          }, 2000);

          // クリーンアップ
          request.signal.addEventListener('abort', () => {
            console.log('SSE接続が中止されました');
            isControllerClosed = true;
            clearInterval(interval);
            try {
              controller.close();
            } catch (error) {
              console.error('SSEコントローラー閉鎖エラー:', error);
            }
          });

          // エラーハンドリングを改善
          request.signal.addEventListener('error', () => {
            console.log('SSE接続でエラーが発生しました');
            isControllerClosed = true;
            clearInterval(interval);
            try {
              controller.close();
            } catch (error) {
              console.error('SSEコントローラー閉鎖エラー:', error);
            }
          });


        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Cache-Control'
        }
      }
    );

    return response;
  } catch (error) {
    console.error('SSE初期化エラー:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 