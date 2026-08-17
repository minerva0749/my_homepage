// 附件上传与下载。
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const {
  UPLOAD_DIR,
  IMAGE_EXTENSIONS,
  FILE_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_UPLOAD,
} = require('../uploads');

const router = express.Router();

// multer：存到上传目录，文件名 UUID 化（保留扩展名仅用于下载时识别类型）。
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 20 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      file.kind = 'image';
      return cb(null, true);
    }
    if (FILE_EXTENSIONS.has(ext)) {
      file.kind = 'file';
      return cb(null, true);
    }
    return cb(new Error('不支持的文件类型: ' + ext));
  },
});

function removeFiles(files) {
  for (const f of files || []) {
    fs.unlink(f.path, () => {});
  }
}

// POST /api/upload —— 仅 admin。
router.post('/upload', requireAuth, (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      removeFiles(req.files);
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? '单个文件超过 20MB 上限'
          : err.code === 'LIMIT_FILE_COUNT'
            ? '单次最多上传 20 个文件'
            : err.message || '上传失败';
      return res.status(400).json({ error: message });
    }

    const files = req.files || [];
    const images = files.filter((f) => f.kind === 'image');

    if (images.length > MAX_IMAGES_PER_UPLOAD) {
      removeFiles(files);
      return res.status(400).json({
        error: `图片单次最多上传 ${MAX_IMAGES_PER_UPLOAD} 张`,
      });
    }
    for (const f of images) {
      if (f.size > MAX_IMAGE_SIZE) {
        removeFiles(files);
        return res.status(400).json({ error: `图片 ${f.originalname} 超过 10MB 上限` });
      }
    }

    try {
      const created = [];
      for (const f of files) {
        const info = db
          .prepare(
            'INSERT INTO attachments (post_id, kind, orig_name, stored_name, size) VALUES (?, ?, ?, ?, ?)'
          )
          .run(null, f.kind, f.originalname, f.filename, f.size);
        created.push({
          id: Number(info.lastInsertRowid),
          kind: f.kind,
          orig_name: f.originalname,
          stored_name: f.filename,
          size: f.size,
        });
      }
      res.status(201).json({ attachments: created });
    } catch (e) {
      removeFiles(files);
      return res.status(500).json({ error: '保存附件失败' });
    }
  });
});

// GET /api/attachments/:id/download —— 公开，以原始文件名作为下载文件名。
router.get('/attachments/:id/download', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '无效的附件 id' });
  }
  const att = db
    .prepare('SELECT id, orig_name, stored_name FROM attachments WHERE id = ?')
    .get(id);
  if (!att) return res.status(404).json({ error: '附件不存在' });

  const filePath = path.join(UPLOAD_DIR, path.basename(att.stored_name));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  // res.download 会设置 Content-Disposition: attachment，浏览器只下载、不解析执行。
  res.download(filePath, att.orig_name);
});

module.exports = router;
