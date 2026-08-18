import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import About from './pages/About.jsx';
import Settings from './pages/Settings.jsx';
import './styles.css';

// 应用外壳：顶部固定导航（动态主页 / 作者简介 / 网页设置）+ 登录入口 + 路由。
export default function App() {
  const { user, loading, logout } = useAuth();

  return (
    <div>
      <header className="topnav">
        <Link className="brand" to="/">
          个人主页
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>
            动态主页
          </NavLink>
          <NavLink to="/about">作者简介</NavLink>
          {user ? <NavLink to="/settings">网页设置</NavLink> : null}
        </nav>
        <div className="auth-area">
          {loading ? null : user ? (
            <>
              <span className="who">{user.nickname}</span>
              <button className="btn btn-sm" onClick={logout}>
                退出登录
              </button>
            </>
          ) : (
            <Link className="btn btn-sm" to="/login">
              登录
            </Link>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
