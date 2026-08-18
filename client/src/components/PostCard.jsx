import { useState } from 'react';
import { formatSize, formatDateTime } from '../utils.js';

// 长文折叠判定：正文超过 500 字符 或 超过 10 行。
function shouldFoldContent(content) {
  if (!content) return false;
  return content.length > 500 || content.split('\n').length > 10;
}

// 折叠态摘要：优先按 10 行截断；不足 10 行但超长时按 500 字符截断。
function foldSummary(content) {
  const lines = content.split('\n');
  if (lines.length > 10) return lines.slice(0, 10).join('\n') + '…';
  return content.slice(0, 500) + '…';
}

// 单条动态卡片：正文（可折叠）/ 图片网格 / 文件附件，以及 admin 的操作（置顶/编辑/删除）。
export default function PostCard({ post, isAdmin, authorName, onTogglePin, onEditSave, onDelete, onViewImage }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const images = (post.attachments || []).filter((a) => a.kind === 'image');
  const files = (post.attachments || []).filter((a) => a.kind === 'file');
  const long = shouldFoldContent(post.content || '');
  // 编辑过：updated_at 晚于 created_at（两者均为 UTC 文本，可直接字符串比较）。
  const edited = (post.updated_at || '') > (post.created_at || '');

  function startEdit() {
    setEditing(true);
    setEditText(post.content || '');
    setError('');
  }

  async function saveEdit() {
    setError('');
    setBusy(true);
    try {
      await onEditSave(post, editText);
      setEditing(false);
    } catch (e) {
      setError(e.message || '编辑失败');
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!window.confirm('确定删除这条动态吗？删除后不可恢复。')) return;
    setBusy(true);
    try {
      await onDelete(post);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="post-card">
      <div className="post-head">
        {authorName ? <span className="post-author">{authorName}</span> : null}
        {post.is_pinned ? <span className="pin-badge">置顶</span> : null}
        <span className="post-time">{formatDateTime(post.created_at)}</span>
        {edited ? <span className="edited-tag">已编辑</span> : null}
      </div>

      {editing ? (
        <div className="edit-area">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
          />
          {error ? <div className="inline-error">{error}</div> : null}
          <div className="edit-actions">
            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
            <button className="btn btn-sm" onClick={() => setEditing(false)} disabled={busy}>
              取消
            </button>
          </div>
        </div>
      ) : post.content ? (
        <div className="post-content">
          {long && !expanded ? foldSummary(post.content) : post.content}
        </div>
      ) : null}

      {long && !editing ? (
        <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '展开'}
        </button>
      ) : null}

      {images.length > 0 ? (
        <div className="images-grid">
          {images.map((img) => (
            <div
              key={img.id}
              className="img-cell"
              onClick={() => onViewImage(`/api/attachments/${img.id}/view`)}
            >
              <img
                src={`/api/attachments/${img.id}/view`}
                alt={img.orig_name}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="file-list">
          {files.map((f) => (
            <div className="file-row" key={f.id}>
              <span className="file-icon">📄</span>
              <span className="file-meta">
                <span className="file-name">{f.orig_name}</span>
                <span className="file-size">{formatSize(f.size)}</span>
              </span>
              <a href={`/api/attachments/${f.id}/download`}>下载</a>
            </div>
          ))}
        </div>
      ) : null}

      {isAdmin && !editing ? (
        <div className="post-actions">
          <button className="btn-link" onClick={() => onTogglePin(post)} disabled={busy}>
            {post.is_pinned ? '取消置顶' : '置顶'}
          </button>
          <button className="btn-link" onClick={startEdit} disabled={busy}>
            编辑
          </button>
          <button className="btn-link danger" onClick={doDelete} disabled={busy}>
            删除
          </button>
        </div>
      ) : null}
    </article>
  );
}
