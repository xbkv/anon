import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';

// グローバルなSocket.IOインスタンス
declare global {
  var io: SocketIOServer | undefined;
}

let io: SocketIOServer | null = null;

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Socket.IO endpoint' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, room } = body;

    if (!io) {
      return NextResponse.json({ error: 'Socket.IO server not initialized' }, { status: 500 });
    }

    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Socket.IO POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Socket.IOサーバーの初期化
export function initializeSocketIO(server: any) {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      console.log('Socket.IO client connected:', socket.id);

      // スレッドルームに参加
      socket.on('join_thread', (threadId: string) => {
        socket.join(`thread_${threadId}`);
        console.log(`Client ${socket.id} joined thread ${threadId}`);
      });

      // スレッドルームから退出
      socket.on('leave_thread', (threadId: string) => {
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

// 新しい投稿を通知する関数
export function notifyNewPost(threadId: string, postData: any) {
  if (io) {
    io.to(`thread_${threadId}`).emit('new_post', postData);
    console.log(`New post notification sent to thread ${threadId}`);
  }
} 