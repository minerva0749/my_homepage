import { useAuth } from '../auth.jsx';

// 首页（本阶段占位；动态流在后续阶段实现）。
export default function Home() {
  const { user } = useAuth();
  return (
    <main style={{ padding: '16px' }}>
      <h1>个人主页</h1>
      {user ? <p>欢迎，{user.nickname}</p> : <p>动态内容将在后续阶段实现。</p>}
    </main>
  );
}
