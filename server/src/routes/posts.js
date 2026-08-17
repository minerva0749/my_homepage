// 动态相关接口：列表 / 发布 / 编辑 / 删除 / 置顶 / 取消置顶。
const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { UPLOAD_DIR } = require('../uploads');

const router = express.Router();

const POST_SELECT =
  'SELECT id, author_id, content, is_pinned, pinned_at, created_at, updated_at FROM posts';

// 把数据库行转成对外字段（is_pinned 0/1 转布尔）。
function toPost(row) {
  return { ...row, is_pinned: !!row.is_pinned };
}

// 批量取动态的附件，按 post_id 分组。
function attachmentsByPost(posts) {
  if (!posts.length) return {};
  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, post_id, kind, orig_name, stored_name, size, created_at
       FROM attachments
       WHERE post_id IN (${placeholders})
       ORDER BY created_at ASC, id ASC`
    )
    .all(...ids);
  const map = {};
  for (const a of rows) {
    (map[a.post_id] ||= []).push(a);
  }
  return map;
}

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 解析并校验 attachmentIds（去重、正整数）。
function parseAttachmentIds(body) {
  if (!Array.isArray(body.attachmentIds)) return [];
  return [
    ...new Set(
      body.attachmentIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];
}

// GET /api/posts —— 公开分页列表。
// 排序：置顶在前（多条置顶按 pinned_at 倒序），其余按 created_at 倒序。
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSizeRaw = parseInt(req.query.pageSize, 10) || 10;
  const pageSize = Math.min(20, Math.max(1, pageSizeRaw));
  const offset = (page - 1) * pageSize;

  const total = db.prepare('SELECT COUNT(*) AS n FROM posts').get().n;
  const posts = db
    .prepare(
      `${POST_SELECT}
       ORDER BY is_pinned DESC, pinned_at DESC, created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);

  const attMap = attachmentsByPost(posts);
  res.json({
    posts: posts.map((p) => ({ ...toPost(p), attachments: attMap[p.id] || [] })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// POST /api/posts —— 仅 admin，正文或附件至少其一。
router.post('/', requireAuth, (req, res) => {
  const body = req.body || {};
  const content = typeof body.content === 'string' ? body.content : '';
  const attachmentIds = parseAttachmentIds(body);
  const hasContent = content.trim().length > 0;

  if (!hasContent && attachmentIds.length === 0) {
    return res.status(400).json({ error: '正文或附件至少填一项' });
  }

  // 校验附件都存在、且尚未被其它动态使用。
  if (attachmentIds.length > 0) {
    const placeholders = attachmentIds.map(() => '?').join(',');
    const rows = db
      .prepare(`SELECT id, post_id FROM attachments WHERE id IN (${placeholders})`)
      .all(...attachmentIds);
    const found = new Set(rows.map((r) => r.id));
    for (const id of attachmentIds) {
      if (!found.has(id)) {
        return res.status(400).json({ error: `附件 ${id} 不存在` });
      }
    }
    if (rows.some((r) => r.post_id !== null)) {
      return res.status(400).json({ error: '附件已被其它动态使用' });
    }
  }

  let postId;
  db.exec('BEGIN');
  try {
    const info = db
      .prepare('INSERT INTO posts (author_id, content) VALUES (?, ?)')
      .run(req.user.id, content);
    postId = Number(info.lastInsertRowid);
    const attach = db.prepare('UPDATE attachments SET post_id = ? WHERE id = ?');
    for (const id of attachmentIds) attach.run(postId, id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const post = db.prepare(`${POST_SELECT} WHERE id = ?`).get(postId);
  const attMap = attachmentsByPost([post]);
  res
    .status(201)
    .json({ post: { ...toPost(post), attachments: attMap[post.id] || [] } });
});

// PUT /api/posts/:id —— 仅 admin，编辑正文并更新 updated_at。
router.put('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的动态 id' });

  const body = req.body || {};
  if (typeof body.content !== 'string') {
    return res.status(400).json({ error: '缺少正文内容' });
  }
  const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '动态不存在' });

  const attCount = db
    .prepare('SELECT COUNT(*) AS n FROM attachments WHERE post_id = ?')
    .get(id).n;
  if (body.content.trim() === '' && attCount === 0) {
    return res.status(400).json({ error: '正文或附件至少其一' });
  }

  db.prepare('UPDATE posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(body.content, id);

  const post = db.prepare(`${POST_SELECT} WHERE id = ?`).get(id);
  const attMap = attachmentsByPost([post]);
  res.json({ post: { ...toPost(post), attachments: attMap[post.id] || [] } });
});

// DELETE /api/posts/:id —— 仅 admin，删除动态并清理附件记录与磁盘文件。
router.delete('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的动态 id' });

  const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '动态不存在' });

  // 先取附件存储名，用于删除磁盘文件。
  const atts = db
    .prepare('SELECT id, stored_name FROM attachments WHERE post_id = ?')
    .all(id);

  // 删除动态；ON DELETE CASCADE 会级联删除 attachments 记录。
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);

  for (const a of atts) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(a.stored_name)), () => {});
  }

  res.json({ ok: true, deletedAttachments: atts.length });
});

// POST /api/posts/:id/pin —— 仅 admin，置顶（写入 pinned_at）。
router.post('/:id/pin', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的动态 id' });

  const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '动态不存在' });

  db.prepare(
    'UPDATE posts SET is_pinned = 1, pinned_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(id);

  const post = db.prepare(`${POST_SELECT} WHERE id = ?`).get(id);
  res.json({ post: toPost(post) });
});

// POST /api/posts/:id/unpin —— 仅 admin，取消置顶。
router.post('/:id/unpin', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: '无效的动态 id' });

  const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '动态不存在' });

  db.prepare('UPDATE posts SET is_pinned = 0, pinned_at = NULL WHERE id = ?').run(id);

  const post = db.prepare(`${POST_SELECT} WHERE id = ?`).get(id);
  res.json({ post: toPost(post) });
});

module.exports = router;
