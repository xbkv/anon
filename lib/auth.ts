// 認証セッション管理用のMap
const authSessions = new Map<string, { userId: string; expiresAt: number }>();

// 認証トークンを検証する関数（他のAPIで使用）
export function verifyAuthToken(token: string): { isValid: boolean; userId?: string } {
  const session = authSessions.get(token);
  
  if (!session) {
    return { isValid: false };
  }
  
  // 有効期限チェック
  if (Date.now() > session.expiresAt) {
    authSessions.delete(token);
    return { isValid: false };
  }
  
  return { isValid: true, userId: session.userId };
}

// 古いセッションをクリーンアップする関数
export function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of authSessions.entries()) {
    if (now > session.expiresAt) {
      authSessions.delete(token);
    }
  }
}

// セッションを保存する関数
export function saveAuthSession(token: string, userId: string, expiresAt: number) {
  authSessions.set(token, {
    userId: userId,
    expiresAt: expiresAt
  });
} 