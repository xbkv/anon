// セキュリティテスト用のユーティリティ関数

export const XSS_TEST_PAYLOADS = [
  // 基本的なスクリプト注入
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">',
  
  // イベントハンドラー攻撃
  '<img src="x" onclick="alert(\'XSS\')">',
  '<div onmouseover="alert(\'XSS\')">Hover me</div>',
  '<input onfocus="alert(\'XSS\')" autofocus>',
  
  // JavaScript URI攻撃
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<img src="javascript:alert(\'XSS\')">',
  
  // データURI攻撃
  '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
  '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>',
  
  // エンコード攻撃
  '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">',
  '<script>&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;</script>',
  
  // コメント攻撃
  '<!--<script>alert("XSS")</script>-->',
  '<!--><script>alert("XSS")</script>-->',
  
  // 条件付きコメント攻撃
  '<!--[if IE]><script>alert("XSS")</script><![endif]-->',
  
  // エスケープ攻撃
  '<img src="x" onerror="alert(\'XSS\')" />',
  '<img src="x" onerror="alert(\'XSS\')" >',
  
  // 大文字小文字攻撃
  '<SCRIPT>alert("XSS")</SCRIPT>',
  '<Img src="x" OnError="alert(\'XSS\')">',
  
  // 空白文字攻撃
  '<script >alert("XSS")</script>',
  '<img src="x" onerror ="alert(\'XSS\')">',
  
  // 引用符攻撃
  '<img src="x" onerror=alert(\'XSS\')>',
  '<img src=x onerror=alert(\'XSS\')>',
  
  // 複合攻撃
  '<img src="x" onerror="alert(\'XSS\')" alt="<script>alert(\'XSS\')</script>">',
  '<div><script>alert("XSS")</script></div>',
  
  // 安全なコンテンツ（テスト用）
  'これは安全なテキストです',
  '<img src="https://cdn.yay.space/uploads/test.jpg" alt="安全な画像">',
  '>>123 これは参照です',
];

export const testXSSProtection = (content: string): boolean => {
  // 危険なパターンをチェック
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /\s*on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript:/gi,
    /<(iframe|object|embed|form|input|textarea|select|button|link|meta|style|title|head|body|html|frame|frameset|noframes|applet|base|basefont|bgsound|isindex|keygen|listing|plaintext|xmp)\b[^>]*>/gi,
    /\s*(href|src)\s*=\s*["']\s*javascript:/gi,
    /\s*data:\s*text\/html/gi,
    /<!--[\s\S]*?-->/g,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
};

export const logSecurityTest = (testName: string, payload: string, result: boolean) => {
  console.log(`🔒 セキュリティテスト: ${testName}`);
  console.log(`📝 ペイロード: ${payload}`);
  console.log(`✅ 結果: ${result ? '安全' : '危険'}`);
  console.log('---');
}; 