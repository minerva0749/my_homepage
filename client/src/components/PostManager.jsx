import { useEffect, useState } from 'react';
import { formatDateTime } from '../utils.js';

const PAGE_SIZE = 10;

// 生成管理列表里的内容摘要。
function summary(post) {
  const text = (post.content || '').trim();
  const attCount = (post.attachments || []).length;
  const parts = [];
  if (text) parts.push(text.length > 60 ? text.slice(0, 60) + '…' : text);
  if (attCount > 0) parts.push(`〔${attCount} 个附件〕`);
  return parts.join(' ') || '（无文字）';
}

// 动态集中管理列表：置顶/取消置顶、编辑（内联）、删除（二次确认）。
export default function PostManager() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(p) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/posts?page=${p}&pageSize=${PAGE_SIZE}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '加载失败');
      setPosts(data.posts || []);
      setPagination(
        data.pagination || { page: p, pageSize: PAGE_SIZE, total: 0, totalPages: 1 }
      );
    } catch (e) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
  }, [page]);

  async function togglePin(post) {
    setBusy(true);
    const action = post.is_pinned ? 'unpin' : 'pin';
    const res = await fetch(`/api/posts/${post.id}/${action}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || '操作失败');
    await load(page);
    setBusy(false);
  }

  function startEdit(post) {
    setEditingId(post.id);
    setEditText(post.content || '');
  }

  async function saveEdit(post) {
    setBusy(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || '编辑失败');
      setBusy(false);
      return;
    }
    setEditingId(null);
    await load(page);
    setBusy(false);
  }

  async function remove(post) {
    if (!window.confirm('确定删除这条动态吗？删除后不可恢复。')) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || '删除失败');
      setBusy(false);
      return;
    }
    if (posts.length === 1 && page > 1) setPage(page - 1);
    else await load(page);
    setBusy(false);
  }

  if (loading) return <div className="feed-status">加载中…</div>;
  if (error) {
    return (
      <div className="feed-error">
        <div>{error}</div>
        <div style={{ marginTop: '8px' }}>
          <button className="btn btn-sm" onClick={() => load(page)}>
            重试
          </button>
        </div>
      </div>
    );
  }
  if (posts.length === 0) return <div className="feed-status">暂无动态</div>;

  return (
    <div>
      <div className="manager-list">
        {posts.map((post) => (
          <div className="manager-item" key={post.id}>
            {editingId === post.id ? (
              <div className="manager-edit">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                />
                <div className="edit-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(post)} disabled={busy}>
                    保存
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditingId(null)} disabled={busy}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="manager-item-head">
                  {post.is_pinned ? <span className="pin-badge">置顶</span> : null}
                  <span className="post-time">{formatDateTime(post.created_at)}</span>
                </div>
                <div className="manager-item-content">{summary(post)}</div>
                <div className="post-actions">
                  <button className="btn-link" onClick={() => togglePin(post)} disabled={busy}>
                    {post.is_pinned ? '取消置顶' : '置顶'}
                  </button>
                  <button className="btn-link" onClick={() => startEdit(post)} disabled={busy}>
                    编辑
                  </button>
                  <button className="btn-link danger" onClick={() => remove(post)} disabled={busy}>
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="pagination">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          上一页
        </button>
        <span className="page-info">
          第 {pagination.page} / {Math.max(1, pagination.totalPages)} 页 · 共 {pagination.total} 条
        </span>
        <button
          className="btn btn-sm"
          disabled={page >= pagination.totalPages}
          onClick={() => setPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
