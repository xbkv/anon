import type { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import type { Server as NetServer } from 'http';

// 型を拡張して res.socket.server.io を扱えるようにする
export type NextApiResponseServerIo = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

// API ルートでは bodyParser を切っておかないと Socket.IO が正しくハンドシェイクできない
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIo) {
  // すでに Socket.IO サーバーが存在する場合は再生成しない
  if (res.socket.server.io) {
    return res.end();
  }

  console.log('🔌 Initialising Socket.IO server...');

  const io = new ServerIO(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? [
              'https://jirai-keijiban.com',
              'https://www.jirai-keijiban.com',
              'http://jirai-keijiban.com',
              'http://www.jirai-keijiban.com',
            ]
          : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('✅ Socket.IO client connected:', socket.id);

    socket.on('join_thread', (threadId: string) => {
      socket.join(`thread_${threadId}`);
      console.log(`▶ Client ${socket.id} joined thread ${threadId}`);
    });

    socket.on('leave_thread', (threadId: string) => {
      socket.leave(`thread_${threadId}`);
      console.log(`⏹ Client ${socket.id} left thread ${threadId}`);
    });

    socket.on('disconnect', () => {
      console.log('❎ Socket.IO client disconnected:', socket.id);
    });
  });

  // グローバルに保持して他のサーバーレス関数から利用できるようにする
  (global as any).io = io;

  res.socket.server.io = io;
  res.end();
}