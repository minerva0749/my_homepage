import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useProfile } from './profile.jsx';
import { useTheme } from './theme.jsx';
import SiteBackground from './components/SiteBackground.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import About from './pages/About.jsx';
import Settings from './pages/Settings.jsx';
import './styles.css';

// 应用外壳：全站全屏背景层 + 顶部导航 + 路由。
export default function App() {
  const { user, loading, logout } = useAuth();
  const { profile } = useProfile();
  const { theme, toggle } = useTheme();

  return (
    <div>
      {/* 最底层：全站共用、固定不动的全屏背景 */}
      <SiteBackground profile={profile} />

      {/* 上层内容：导航 + 页面 */}
      <div className="app-content">
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
            <button
              className="theme-toggle"
              onClick={toggle}
              title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
              aria-label="切换主题"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {loading ? null : user ? (
              <>
                <span className="who">{profile?.nickname || user?.nickname}</span>
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
    </div>
  );
}
