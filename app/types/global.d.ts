import { MongoClient } from 'mongodb';
import DOMPurify from 'dompurify';

declare global {
  var io: any;
  var MongoClient: MongoClient;
  var DOMPurify: DOMPurify;
}

export {};
