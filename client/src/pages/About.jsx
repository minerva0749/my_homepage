import { useProfile } from '../profile.js';
import SiteBanner from '../components/SiteBanner.jsx';

// 作者简介页（公开）：顶部为站点背景图横幅（与主页共用），下方显示昵称与简介。
export default function About() {
  const profile = useProfile();
  const nickname = profile?.nickname || '个人主页';
  const bio = profile?.bio || '';

  return (
    <div>
      <SiteBanner profile={profile} />
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
    </div>
  );
}
