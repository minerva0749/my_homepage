// 登录态管理：基于 SQLite sessions 表的 HttpOnly Cookie Session。
const crypto = require('crypto');
const { db } = require('./db');

// Cookie 名称与有效期（7 天）。
const COOKIE_NAME = 'sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// HttpOnly：JS 无法读取，防 XSS 窃取；
// SameSite=Lax：拦截跨站请求携带 Cookie，兼作基础 CSRF 防护；
// secure：仅生产（HTTPS）开启，本地开发走 http 时为 false。
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_MS,
};

// 创建一个会话，返回随机 token。
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expiresAt);
  return { token, expiresAt };
}

// 根据 token 取回用户；token 无效或已过期返回 null。
function getSessionUser(token) {
  if (!token) return null;
  const session = db
    .prepare('SELECT token, user_id, expires_at FROM sessions WHERE token = ?')
    .get(token);
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db
    .prepare('SELECT id, username, nickname, bio FROM users WHERE id = ?')
    .get(session.user_id);
  return user || null;
}

// 删除会话（退出登录）。
function destroySession(token) {
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
}

// 清理已过期会话（服务启动时调用一次）。
function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

// 鉴权中间件：未登录返回 401，登录则把用户信息挂到 req.user 上。
// 后续所有管理类接口（发动态、上传、设置等）都必须使用本中间件做服务端鉴权，
// 不能只靠前端隐藏入口。
function requireAuth(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  req.user = user;
  next();
}

module.exports = {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  createSession,
  getSessionUser,
  destroySession,
  cleanupExpiredSessions,
  requireAuth,
};
