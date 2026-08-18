// 站点资料接口：公开读取昵称 / 简介 / 背景图地址；以及背景图的内联访问。
const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { UPLOAD_DIR } = require('../uploads');

const router = express.Router();

// 读取唯一作者（admin）的资料与站点背景图设置。
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

// GET /api/profile —— 公开：返回昵称 + 简介 + 背景图地址（未设置背景图时为 null）。
router.get('/profile', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(readProfile());
});

// GET /api/site/background —— 公开：内联返回当前站点背景图（未设置返回 404）。
// 背景图文件存在 server/uploads/ 里，由 site_settings.background_image 记录其存储文件名。
router.get('/site/background', (req, res) => {
  const setting = db
    .prepare('SELECT background_image FROM site_settings LIMIT 1')
    .get();
  const stored = setting && setting.background_image;
  if (!stored) return res.status(404).json({ error: '未设置背景图' });

  const filePath = path.join(UPLOAD_DIR, path.basename(stored));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '背景图文件不存在' });
  }

  const MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const ext = path.extname(stored).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(filePath);
});

module.exports = router;
