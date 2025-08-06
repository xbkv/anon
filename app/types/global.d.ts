import { MongoClient } from 'mongodb';
import DOMPurify from 'dompurify';

declare global {
  let io: any;
  let MongoClient: MongoClient;
  let DOMPurify: DOMPurify;
}

export {};
