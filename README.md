# BerugoChat

匿名掲示板アプリケーション

## セットアップ

### 必要な環境変数

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Yay API設定（描画機能・画像アップロード機能用）
YAY_HOST=https://api.yay.space/
YAY_ACCESS_TOKEN=your-yay-access-token

# MongoDB設定
MONGODB_URI=your-mongodb-uri

# reCAPTCHA設定（オプション）
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```

### Yay API設定

1. Yayアカウントを作成
2. APIアクセストークンを取得
3. 描画画像とアップロード画像がYayのCDNに保存される

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

## 機能

- 匿名投稿
- スレッド作成・管理
- お絵描き機能（Yay CDN保存）
- 画像アップロード機能（Yay CDN保存）
- リアルタイム更新
- スパム対策
- レスポンシブデザイン
