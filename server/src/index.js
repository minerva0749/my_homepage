// 后端服务：
//   - 启动时自动执行数据库初始化（幂等）。
//   - GET /api/health 返回 {"ok":true}。
//   - /api/auth 提供登录 / 退出 / 当前用户接口。
//   - 静态托管前端构建产物 client/dist。
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const { initDb } = require('./initDb');
const { dbPath } = require('./db');
const { cleanupExpiredSessions } = require('./auth');
const authRouter = require('./routes/auth');

// 启动时初始化数据库（重复执行安全），并清理过期会话。
initDb();
cleanupExpiredSessions();

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体与 Cookie。
app.use(express.json());
app.use(cookieParser());

// 健康检查接口（公开）。
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// 认证接口：登录 / 退出 / 当前用户。
app.use('/api/auth', authRouter);

// 未匹配的 /api 路径统一返回 404（避免被下面的 SPA 兜底吞掉）。
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 静态托管前端构建产物（client/dist）。
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA 兜底：非 /api 的路径都返回 index.html，交给前端路由处理。
app.get('*', (req, res) => {
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res
      .status(200)
      .send('前端尚未构建：请先在 client 目录执行 npm.cmd run build。');
  }
});

app.listen(PORT, () => {
  console.log(`后端已启动: http://localhost:${PORT}`);
  console.log(`健康检查:   http://localhost:${PORT}/api/health`);
  console.log(`数据库文件: ${dbPath}`);
});
