import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// 网页设置页（仅 admin，占位）：完整内容在后续阶段实现。
// 未登录访问时跳转到登录页（对应文档 3.1）。
export default function Settings() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <div className="feed-status">加载中…</div>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <main className="page">
      <div className="feed-status" style={{ paddingTop: '40px' }}>
        网页设置页面将在后续阶段实现（当前登录：{user.nickname}）。
      </div>
    </main>
  );
}
