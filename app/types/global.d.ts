import { MongoClient } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export interface Thread {
  _id: string;
  threadId: string;
  title: string;
  description: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  content: string;
  threadId: string;
  postNumber?: number;
  userIp?: string;
  userAgent?: string;
  type?: "thread_creator" | "user_post";
  createdAt: string;
  clickPosition?: { top: number; left: number };
}

export {};
