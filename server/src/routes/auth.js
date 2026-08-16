// 认证相关接口：登录 / 退出 / 当前用户。
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  createSession,
  destroySession,
  requireAuth,
} = require('../auth');

const router = express.Router();

// 用户不存在时也做一次 bcrypt 比对，避免响应时间差异泄露“用户是否存在”。
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 10);

// 登录限流：每个 IP 每分钟最多 5 次尝试（防暴力破解）。
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: '尝试次数过多，请稍后再试' });
  },
});

// POST /api/auth/login —— 校验用户名密码，成功后建立 HttpOnly Cookie 会话。
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username ||
    !password
  ) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db
    .prepare(
      'SELECT id, username, nickname, bio, password_hash FROM users WHERE username = ?'
    )
    .get(username);

  // 无论用户是否存在都做一次 bcrypt 比对，返回统一错误提示，不区分“用户不存在”与“密码错误”。
  const passwordOk = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH
  );
  if (!user || !passwordOk) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const { token } = createSession(user.id);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  return res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      bio: user.bio,
    },
  });
});

// POST /api/auth/logout —— 退出登录（删除会话 + 清除 Cookie）。
router.post('/logout', (req, res) => {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  destroySession(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

// GET /api/auth/me —— 返回当前登录用户信息（走 requireAuth 中间件，未登录 401）。
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
