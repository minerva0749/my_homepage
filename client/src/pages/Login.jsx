import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// 登录页：账号 + 密码表单；成功跳回首页，失败显示错误提示。
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <div className="login-card">
        <h1 className="login-title">登录</h1>
        <form onSubmit={handleSubmit}>
          <label className="settings-label">账号</label>
          <input
            className="settings-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <label className="settings-label">密码</label>
          <input
            className="settings-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error ? <div className="settings-err">{error}</div> : null}
          <div className="settings-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? '登录中…' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
