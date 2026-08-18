import { useEffect } from 'react';

// 点击缩略图后全屏查看原图的浮层；点击空白处 / 关闭按钮 / 按 Esc 关闭。
export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="close" onClick={onClose} title="关闭">
        ×
      </button>
      <img src={src} alt="原图" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
