import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useProfile } from '../profile.jsx';
import PostManager from '../components/PostManager.jsx';

// 网页设置页（仅 admin）：基本资料（昵称/简介）、背景图、修改密码、动态管理。
export default function Settings() {
  const { user, loading, logout } = useAuth();
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();

  // 基本资料
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // 背景图
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [bgMsg, setBgMsg] = useState('');
  const [bgError, setBgError] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);

  // 修改密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // 资料加载后填充表单
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

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

  async function saveProfile() {
    setProfileError('');
    setProfileMsg('');
    if (!nickname.trim()) {
      setProfileError('昵称不能为空');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, bio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '保存失败');
      await refresh();
      setProfileMsg('已保存');
    } catch (e) {
      setProfileError(e.message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  }

  function onPickBg(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      setBgError('背景图仅支持 JPG / PNG / WebP');
      setBgFile(null);
      setBgPreview(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBgError('背景图超过 10MB 上限');
      setBgFile(null);
      setBgPreview(null);
      return;
    }
    setBgError('');
    setBgMsg('');
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  }

  async function uploadBg() {
    setBgError('');
    setBgMsg('');
    if (!bgFile) {
      setBgError('请先选择背景图');
      return;
    }
    setUploadingBg(true);
    try {
      const fd = new FormData();
      fd.append('background', bgFile);
      const res = await fetch('/api/site/background', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '上传失败');
      await refresh();
      setBgMsg('背景图已更新');
      if (bgPreview) URL.revokeObjectURL(bgPreview);
      setBgFile(null);
      setBgPreview(null);
    } catch (e) {
      setBgError(e.message || '上传失败');
    } finally {
      setUploadingBg(false);
    }
  }

  async function changePassword() {
    setPwError('');
    if (!oldPassword) {
      setPwError('请输入原密码');
      return;
    }
    if (!newPassword) {
      setPwError('请输入新密码');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('新密码至少 8 位');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPwError('新密码需同时包含字母和数字');
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '修改失败');
      // 服务端已删除全部会话；这里清除本地登录态与 Cookie，跳回登录页。
      await logout();
      navigate('/login');
    } catch (e) {
      setPwError(e.message || '修改失败');
      setChangingPw(false);
    }
  }

  const bgUrl = bgPreview || profile?.background_image || '/placeholder-bg.svg';

  return (
    <main className="page settings-page">
      <h1 className="settings-title">网页设置</h1>

      {/* 基本资料：昵称 + 简介 */}
      <section className="settings-card">
        <h2>基本资料</h2>
        <label className="settings-label">昵称</label>
        <input
          className="settings-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <label className="settings-label">简介</label>
        <textarea
          className="settings-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
        />
        <div className="settings-actions">
          <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? '保存中…' : '保存'}
          </button>
        </div>
        {profileMsg ? <div className="settings-ok">{profileMsg}</div> : null}
        {profileError ? <div className="settings-err">{profileError}</div> : null}
      </section>

      {/* 更换背景图 */}
      <section className="settings-card">
        <h2>背景图</h2>
        <div className="settings-bg-preview" style={{ backgroundImage: `url(${bgUrl})` }} />
        <div className="settings-hint">支持 JPG / PNG / WebP，≤ 10MB；上传后主页与简介页立即同步。</div>
        <div className="settings-actions">
          <label className="btn btn-sm">
            选择图片
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              hidden
              onChange={onPickBg}
            />
          </label>
          <button className="btn btn-primary btn-sm" onClick={uploadBg} disabled={uploadingBg || !bgFile}>
            {uploadingBg ? '上传中…' : '上传并更换'}
          </button>
        </div>
        {bgMsg ? <div className="settings-ok">{bgMsg}</div> : null}
        {bgError ? <div className="settings-err">{bgError}</div> : null}
      </section>

      {/* 修改密码 */}
      <section className="settings-card">
        <h2>修改密码</h2>
        <label className="settings-label">原密码</label>
        <input
          className="settings-input"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoComplete="current-password"
        />
        <label className="settings-label">新密码</label>
        <input
          className="settings-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div className="settings-hint">新密码至少 8 位，且必须同时包含字母和数字。</div>
        <div className="settings-actions">
          <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={changingPw}>
            {changingPw ? '修改中…' : '修改密码'}
          </button>
        </div>
        {pwError ? <div className="settings-err">{pwError}</div> : null}
      </section>

      {/* 动态管理 */}
      <section className="settings-card">
        <h2>动态管理</h2>
        <PostManager />
      </section>
    </main>
  );
}
