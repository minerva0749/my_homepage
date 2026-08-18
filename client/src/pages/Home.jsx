import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useProfile } from '../profile.jsx';
import SiteBanner from '../components/SiteBanner.jsx';
import PostComposer from '../components/PostComposer.jsx';
import PostCard from '../components/PostCard.jsx';
import Lightbox from '../components/Lightbox.jsx';

const PAGE_SIZE = 10; // 文档 4.2：每页 10 条，采用页码分页（上一页/下一页）。

// 动态主页：站点横幅 + 发布框（仅 admin）+ 动态流 + 分页。
export default function Home() {
  const { user } = useAuth();
  const isAdmin = !!user;
  const { profile } = useProfile();

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
  const [toast, setToast] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  async function loadPosts(p) {
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
    loadPosts(page);
  }, [page]);

  // 发布成功后：提示 + 回到第 1 页刷新（新动态按排序出现在顶部区域）。
  function handlePublished() {
    showToast('发布成功');
    if (page === 1) loadPosts(1);
    else setPage(1);
  }

  // 置顶 / 取消置顶后重新加载当前页，让排序立即生效。
  async function handleTogglePin(post) {
    const action = post.is_pinned ? 'unpin' : 'pin';
    const res = await fetch(`/api/posts/${post.id}/${action}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || '操作失败');
      return;
    }
    await loadPosts(page);
    showToast(post.is_pinned ? '已取消置顶' : '已置顶');
  }

  // 编辑：成功后用后端返回的最新 post 就地更新（会出现“已编辑”标记）。
  async function handleEditSave(post, content) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '编辑失败');
    setPosts((prev) => prev.map((p) => (p.id === post.id ? data.post : p)));
  }

  // 删除后刷新；若删的是当前页最后一条且不在第 1 页，则回退一页。
  async function handleDelete(post) {
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || '删除失败');
      return;
    }
    showToast('已删除');
    if (posts.length === 1 && page > 1) setPage(page - 1);
    else loadPosts(page);
  }

  return (
    <div>
      <SiteBanner profile={profile} />

      <div className="page">
        {isAdmin ? <PostComposer onPublished={handlePublished} /> : null}

        <div className="feed">
          {loading ? (
            <div className="feed-status">加载中…</div>
          ) : error ? (
            <div className="feed-error">
              <div>{error}</div>
              <div style={{ marginTop: '8px' }}>
                <button className="btn btn-sm" onClick={() => loadPosts(page)}>
                  重试
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-status">暂无动态，欢迎常来～</div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin={isAdmin}
                onTogglePin={handleTogglePin}
                onEditSave={handleEditSave}
                onDelete={handleDelete}
                onViewImage={setLightboxSrc}
                authorName={profile?.nickname || '个人主页'}
              />
            ))
          )}
        </div>

        {!loading && !error && posts.length > 0 ? (
          <div className="pagination">
            <button
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {pagination.page} / {Math.max(1, pagination.totalPages)} 页 · 共{' '}
              {pagination.total} 条
            </span>
            <button
              className="btn btn-sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
          </div>
        ) : null}
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
      {lightboxSrc ? (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      ) : null}
    </div>
  );
}
