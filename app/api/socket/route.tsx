import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

// Socket.IOサーバーの初期化
function getIO() {
  if (!io) {
    io = new SocketIOServer({
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [
              'https://jirai-keijiban.com',
              'https://www.jirai-keijiban.com',
              'http://jirai-keijiban.com',
              'http://www.jirai-keijiban.com'
            ] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Socket.IOイベントハンドラー
    io.on('connection', (socket) => {
      console.log('Socket.IO client connected:', socket.id);

      // スレッドルームに参加
      socket.on('join_thread', (threadId) => {
        socket.join(`thread_${threadId}`);
        console.log(`Client ${socket.id} joined thread ${threadId}`);
      });

      // スレッドルームから退出
      socket.on('leave_thread', (threadId) => {
        socket.leave(`thread_${threadId}`);
        console.log(`Client ${socket.id} left thread ${threadId}`);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO client disconnected:', socket.id);
      });
    });

    // グローバル変数に保存
    global.io = io;
  }
  return io;
}

export async function GET(request: NextRequest) {
  try {
    const io = getIO();
    return NextResponse.json({ status: 'Socket.IO server ready' });
  } catch (error) {
    console.error('Socket.IO error:', error);
    return NextResponse.json({ error: 'Socket.IO server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const io = getIO();
    return NextResponse.json({ status: 'Socket.IO server ready' });
  } catch (error) {
    console.error('Socket.IO error:', error);
    return NextResponse.json({ error: 'Socket.IO server error' }, { status: 500 });
  }
}

// 新しい投稿を通知する関数
export function notifyNewPost(threadId: string, postData: any) {
  if (io) {
    io.to(`thread_${threadId}`).emit('new_post', postData);
    console.log(`New post notification sent to thread ${threadId}`);
  }
} 