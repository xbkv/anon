# 匿名掲示板 API 仕様書

## 概要
このAPIは匿名掲示板システムのバックエンド機能を提供します。5chやたぬき掲示板を参考にした匿名性を重視した設計になっています。

## 認証
- **管理者認証**: `x-admin-key` ヘッダーで管理者APIキーを送信
- **API認証**: `x-api-key` ヘッダーでAPIキーを送信（本番環境）

## 1. モデレーションAPI (`/api/moderation`)

### 投稿削除
```http
DELETE /api/moderation
Headers: x-admin-key: your_admin_key
Body: {
  "postId": "post_id",
  "threadId": "thread_id", 
  "reason": "削除理由"
}
```

### スレッド削除
```http
PUT /api/moderation
Headers: x-admin-key: your_admin_key
Body: {
  "threadId": "thread_id",
  "reason": "削除理由"
}
```

### IP BAN管理
```http
POST /api/moderation
Headers: x-admin-key: your_admin_key
Body: {
  "action": "ban|unban",
  "ip": "192.168.1.1",
  "reason": "BAN理由",
  "duration": 86400 // 秒単位（オプション）
}
```

### NGワード管理
```http
PATCH /api/moderation
Headers: x-admin-key: your_admin_key
Body: {
  "action": "add|remove",
  "word": "NGワード",
  "reason": "追加理由"
}
```

### モデレーション情報取得
```http
GET /api/moderation?type=bans|ng_words|logs
Headers: x-admin-key: your_admin_key
```

## 2. 通知API (`/api/notifications`)

### 通知作成
```http
POST /api/notifications
Body: {
  "type": "new_post|new_thread|mention|thread_update|moderation",
  "threadId": "thread_id",
  "postId": "post_id",
  "content": "通知内容",
  "authorName": "投稿者名"
}
```

### 通知取得
```http
GET /api/notifications?threadId=xxx&type=xxx&limit=50&unread=true
```

### 通知既読
```http
PATCH /api/notifications
Body: {
  "notificationId": "notification_id",
  "threadId": "thread_id"
}
```

### 古い通知削除
```http
DELETE /api/notifications
Body: {
  "days": 30
}
```

## 3. 投票API (`/api/votes`)

### 投票作成
```http
POST /api/votes
Body: {
  "threadId": "thread_id",
  "title": "投票タイトル",
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "type": "single|multiple|rating",
  "allowMultiple": false,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### 投票実行
```http
PUT /api/votes
Body: {
  "voteId": "vote_id",
  "selectedOptions": [1, 2]
}
```

### 投票結果取得
```http
GET /api/votes?voteId=xxx
GET /api/votes?threadId=xxx
```

### 投票管理
```http
PATCH /api/votes
Body: {
  "voteId": "vote_id",
  "action": "end|extend",
  "newExpiresAt": "2024-12-31T23:59:59Z" // extend時のみ
}
```

### 投票削除
```http
DELETE /api/votes
Body: {
  "voteId": "vote_id"
}
```

## 4. ファイル管理API (`/api/files`)

### ファイル一覧取得
```http
GET /api/files?threadId=xxx&type=xxx&page=1&limit=50&admin=true
```

### ファイル情報更新
```http
PUT /api/files
Body: {
  "fileId": "file_id",
  "threadId": "thread_id",
  "description": "ファイル説明",
  "tags": ["タグ1", "タグ2"]
}
```

### ファイル削除
```http
DELETE /api/files
Body: {
  "fileId": "file_id",
  "reason": "削除理由"
}
```

### ファイル統計
```http
PATCH /api/files
Body: {
  "action": "stats"
}
```

## 5. トリップAPI (`/api/trip`)

### トリップ生成
```http
POST /api/trip
Body: {
  "name": "名前",
  "password": "パスワード"
}
```

### 名前解析
```http
GET /api/trip?input=名前#パスワード
```

### トリップ検証
```http
PUT /api/trip
Body: {
  "name": "名前",
  "password": "パスワード",
  "expectedTrip": "期待されるトリップ"
}
```

## 6. 既存APIの更新

### 投稿API (`/api/posts`)
- 投稿時に自動的に通知が作成される
- メンション検出機能が追加される

### スレッドAPI (`/api/threads`)
- スレッド作成時に自動的に通知が作成される

## レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {...},
  "message": "操作が成功しました"
}
```

### エラーレスポンス
```json
{
  "success": false,
  "message": "エラーメッセージ",
  "error": "詳細エラー情報"
}
```

## セキュリティ考慮事項

1. **匿名性の保護**: IPアドレスは内部でのみ使用
2. **レート制限**: スパム防止のための制限
3. **XSS対策**: DOMPurifyによるサニタイゼーション
4. **管理者認証**: 管理者機能はAPIキーで保護
5. **論理削除**: データは完全削除せず論理削除

## データベースコレクション

- `posts`: 投稿データ
- `threads`: スレッドデータ
- `notifications`: 通知データ
- `votes`: 投票データ
- `vote_records`: 投票記録
- `files`: ファイルデータ
- `ip_bans`: IP BANデータ
- `ng_words`: NGワードデータ
- `moderation_logs`: モデレーションログ 