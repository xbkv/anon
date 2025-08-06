import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socketServer';

export async function GET(request: NextRequest) {
  try {
    const io = getIO();
    return NextResponse.json({ status: 'Socket.IO server ready' });
  } catch (error) {
    console.error('Socket.IO error:', error);
    return NextResponse.json({ error: 'Socket.IO server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const io = getIO();
    return NextResponse.json({ status: 'Socket.IO server ready' });
  } catch (error) {
    console.error('Socket.IO error:', error);
    return NextResponse.json({ error: 'Socket.IO server error' }, { status: 500 });
  }
} 