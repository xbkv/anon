const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Socket.IOサーバーを初期化
  const io = new Server(server, {
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

  // グローバル変数に保存（他のファイルからアクセス可能にするため）
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 