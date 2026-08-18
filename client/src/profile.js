// 公开站点资料（昵称 / 简介 / 背景图）：供动态主页与作者简介页共用。
import { useEffect, useState } from 'react';

export function useProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setProfile(data || null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
