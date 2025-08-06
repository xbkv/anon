import { MongoClient } from 'mongodb';
import DOMPurify from 'dompurify';

declare global {
  let io: any;
  let MongoClient: MongoClient;
  let DOMPurify: DOMPurify;
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
