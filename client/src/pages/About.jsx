import { useProfile } from '../profile.jsx';

// 作者简介页（公开）：昵称与简介直接显示在全屏背景上方的卡片中。
export default function About() {
  const { profile } = useProfile();
  const nickname = profile?.nickname || '个人主页';
  const bio = profile?.bio || '';

  return (
    <main className="page">
      <div className="about-card">
        <h2 className="about-nickname">{nickname}</h2>
        {bio ? (
          <div className="about-bio">{bio}</div>
        ) : (
          <div className="about-bio about-bio-empty">（暂无简介）</div>
        )}
      </div>
    </main>
  );
}
