const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();

// レート制限の設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分間に100リクエストまで
  message: 'Too many requests from this IP'
});

app.use(limiter);

// セキュリティヘッダーの設定
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 静的ファイルのキャッシュ設定
app.use('/static', express.static('public', {
  maxAge: '1y',
  etag: true
}));

// Next.jsアプリケーションへのプロキシ
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // APIパスをそのまま転送
  },
  onProxyReq: (proxyReq, req, res) => {
    // リクエストヘッダーの設定
    proxyReq.setHeader('X-Real-IP', req.ip);
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
  },
  onProxyRes: (proxyRes, req, res) => {
    // レスポンスヘッダーの設定
    proxyRes.headers['X-Proxy-By'] = 'Node.js Reverse Proxy';
  }
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Reverse proxy server running on port ${PORT}`);
}); 