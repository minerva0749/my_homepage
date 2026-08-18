// 全站全屏背景层：fixed 铺满整个视口、不随页面滚动移动，所有页面共用这一层。
// 背景图来自 /api/profile（未设置时用占位图 placeholder-bg.svg）；
// 背景色为纯色兜底，图片加载期间不白屏闪烁。
export default function SiteBackground({ profile }) {
  const bg = profile?.background_image || '/placeholder-bg.svg';
  return (
    <div className="site-bg" style={{ backgroundImage: `url("${bg}")` }}>
      <div className="site-bg-overlay" />
    </div>
  );
}
