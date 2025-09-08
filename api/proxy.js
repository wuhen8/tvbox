// api/proxy.js

// 允许任何来源的请求
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // 或者指定你的播放器域名
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 核心的 fetch 函数
const handler = async (req, res) => {
  // 从请求的查询参数中获取目标 URL
  const { url } = req.query;

  // 如果没有提供 url，则返回错误
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    // 使用 fetch 在服务器端请求目标 URL
    const response = await fetch(decodeURIComponent(url));
    
    // 检查目标服务器的响应是否成功
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    // 获取响应内容
    const data = await response.json(); // 假设目标返回的是 JSON

    // 将获取到的数据作为 JSON 返回给前端
    res.status(200).json(data);

  } catch (error) {
    // 如果在 fetch 过程中发生任何错误，则返回 500 错误
    res.status(500).json({ error: error.message });
  }
};

// 导出被 CORS 包装过的 handler
module.exports = allowCors(handler);
