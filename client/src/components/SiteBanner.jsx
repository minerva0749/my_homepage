// 站点横幅：背景图 + 昵称（视觉重心，参考 B 站个人空间头图）。
// 背景图来自 /api/profile（与主页共用同一张站点背景图）；未设置时用占位图 placeholder-bg.svg。
export default function SiteBanner({ profile }) {
  const bg = profile?.background_image || '/placeholder-bg.svg';
  const nickname = profile?.nickname || '个人主页';

  return (
    <section className="hero">
      <img className="hero-bg" src={bg} alt="" />
      <div className="hero-inner">
        <div className="hero-nickname">{nickname}</div>
      </div>
    </section>
  );
}
