// /api/proxy/[...target].js

// Vercel 环境可能需要明确引入 fetch，取决于项目配置
// 如果你的项目是较新的 Next.js，可能已经内置了全局 fetch
const fetch = require('node-fetch');

// 允许任何来源的请求
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // 或者指定你的播放器域名
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 核心的 fetch 函数
const handler = async (req, res) => {
  // ========== 修改部分开始: 直接从 req.url 中提取目标 URL ==========
  const proxyPrefix = '/api/proxy/';
  let targetUrlString;

  // 检查请求 URL 是否以我们的代理前缀开头
  if (req.url.startsWith(proxyPrefix)) {
    // 提取前缀后面的所有内容作为目标 URL
    targetUrlString = req.url.substring(proxyPrefix.length);
  } else {
    // 理论上，由于文件路由，这个分支不会被执行，但作为保险措施
    return res.status(400).json({ error: 'Invalid proxy request format.' });
  }

  // 如果提取后的 URL 为空，则返回错误
  if (!targetUrlString) {
    return res.status(400).json({ error: 'Missing target URL in the path.' });
  }

  // **关键步骤**：处理服务器对 URL 的“规范化”
  // 即使你输入 https://, Vercel收到的 req.url 可能是 /api/proxy/https:/...
  // 所以我们仍然需要这个修复步骤。
  if (targetUrlString.startsWith('https:/') && !targetUrlString.startsWith('https://')) {
    targetUrlString = 'https://' + targetUrlString.substring('https:/'.length);
  }
  if (targetUrlString.startsWith('http:/') && !targetUrlString.startsWith('http://')) {
    targetUrlString = 'http://' + targetUrlString.substring('http:/'.length);
  }
  // ========== 修改部分结束 ==========

  try {
    // 验证URL是否有效
    new URL(targetUrlString);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid target URL provided.', details: e.message });
  }

  try {
    // 准备代理请求的头信息
    const requestHeaders = new Headers();
    if (req.headers['user-agent']) {
      requestHeaders.set('User-Agent', req.headers['user-agent']);
    }
    if (req.headers['accept']) {
      requestHeaders.set('Accept', req.headers['accept']);
    }
    // 你可以根据需要从原始请求中复制更多头信息

    // 使用 fetch 在服务器端请求目标 URL
    const response = await fetch(targetUrlString, {
      method: req.method, // 保持原始请求方法
      headers: requestHeaders,
      // 如果是 POST/PUT 等请求，需要传递 body
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'follow', // 允许 fetch 自动处理重定向
    });

    // 将目标服务器的响应头复制到我们的响应中
    response.headers.forEach((value, name) => {
      // 避免设置 Vercel 不允许的头信息
      if (!['content-encoding', 'transfer-encoding'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // 将目标服务器的状态码设置到我们的响应中
    res.status(response.status);

    // 将响应体作为流直接 pipe 回客户端，这是最高效的方式
    response.body.pipe(res);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'An internal error occurred during the proxy request.', details: error.message });
  }
};

// 导出被 CORS 包装过的 handler
module.exports = allowCors(handler);
