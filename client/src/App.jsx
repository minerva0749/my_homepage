import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const { user, loading, logout } = useAuth();

  return (
    <div>
      {/* 顶部导航：左侧站点名，右侧根据登录态显示“登录”或“退出登录”。 */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid #ddd',
        }}
      >
        <Link to="/">个人主页</Link>
        <span>
          {loading ? null : user ? (
            <button onClick={logout}>退出登录</button>
          ) : (
            <Link to="/login">登录</Link>
          )}
        </span>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}
