import { MongoClient } from 'mongodb';

declare global {
  let DOMPurify: any;
}

export interface Thread {
  _id: string;
  title: string;
  description: string;
  threadId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  content: string;
  threadId: string;
  postNumber: number;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export {};
