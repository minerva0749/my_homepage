// 网页设置相关接口（均仅 admin）：修改昵称/简介、更换背景图、修改密码。
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { UPLOAD_DIR, IMAGE_EXTENSIONS } = require('../uploads');

const router = express.Router();

// 与 site.js 中的 readProfile 保持一致（返回昵称/简介/背景图地址）。
function readProfile() {
  const user = db
    .prepare('SELECT nickname, bio FROM users WHERE username = ?')
    .get('admin');
  const setting = db
    .prepare('SELECT background_image FROM site_settings LIMIT 1')
    .get();
  const background_image =
    setting && setting.background_image ? '/api/site/background' : null;
  return {
    nickname: user ? user.nickname : '',
    bio: user ? user.bio || '' : '',
    background_image,
  };
}

// 背景图上传：单文件、仅图片（JPG/PNG/WebP）、≤10MB。
const backgroundUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) return cb(null, true);
    return cb(new Error('背景图仅支持 JPG / PNG / WebP'));
  },
});

// PUT /api/profile —— 仅 admin：修改昵称与简介。
router.put('/profile', requireAuth, (req, res) => {
  const body = req.body || {};
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio : '';
  if (!nickname) return res.status(400).json({ error: '昵称不能为空' });

  db.prepare('UPDATE users SET nickname = ?, bio = ? WHERE id = ?').run(
    nickname,
    bio,
    req.user.id
  );
  res.json(readProfile());
});

// POST /api/site/background —— 仅 admin：上传并更换站点背景图。
router.post('/site/background', requireAuth, (req, res) => {
  backgroundUpload.single('background')(req, res, (err) => {
    if (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? '背景图超过 10MB 上限'
          : err.message || '上传失败';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: '请选择背景图文件' });

    // 删除旧背景图文件（避免垃圾堆积）。
    const old = db
      .prepare('SELECT background_image FROM site_settings LIMIT 1')
      .get();
    if (old && old.background_image) {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(old.background_image)), () => {});
    }

    // site_settings 为单行表：无行则 INSERT，有行则 UPDATE。
    const row = db
      .prepare('SELECT background_image FROM site_settings LIMIT 1')
      .get();
    if (row) {
      db.prepare('UPDATE site_settings SET background_image = ?').run(req.file.filename);
    } else {
      db.prepare(
        'INSERT INTO site_settings (background_image, site_title) VALUES (?, ?)'
      ).run(req.file.filename, null);
    }

    res.json({ background_image: '/api/site/background' });
  });
});

// PUT /api/auth/password —— 仅 admin：修改密码（验证原密码；成功后删除所有会话，强制重新登录）。
router.put('/auth/password', requireAuth, async (req, res) => {
  const body = req.body || {};
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '原密码和新密码不能为空' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: '新密码至少 8 位' });
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: '新密码需同时包含字母和数字' });
  }

  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .get(req.user.id);
  const ok = await bcrypt.compare(oldPassword, user.password_hash);
  if (!ok) return res.status(400).json({ error: '原密码错误' });

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);

  // 删除该用户全部会话：当前登录立即失效，需重新登录。
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  res.json({ ok: true });
});

module.exports = router;
