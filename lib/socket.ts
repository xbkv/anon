import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });
    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler; 