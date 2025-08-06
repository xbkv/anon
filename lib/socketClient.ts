import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = () => {
  if (!socket) {
    // 環境に応じてSocket.IOサーバーのURLを決定
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin  // Vercelでは同じドメインを使用
      : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');
    
    console.log('Socket.IO connecting to:', socketUrl);
    
    socket = io(socketUrl, {
      path: '/api/socket',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinThread = (threadId: string) => {
  const socket = getSocket();
  socket.emit('join_thread', threadId);
  console.log(`Joined thread: ${threadId}`);
};

export const leaveThread = (threadId: string) => {
  const socket = getSocket();
  socket.emit('leave_thread', threadId);
  console.log(`Left thread: ${threadId}`);
};

export const onNewPost = (callback: (postData: any) => void) => {
  const socket = getSocket();
  socket.on('new_post', callback);
};

export const offNewPost = () => {
  const socket = getSocket();
  socket.off('new_post');
}; 