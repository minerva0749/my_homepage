// 站点公开资料（昵称 / 简介 / 背景图）上下文：全局共享，并提供 refresh 以便修改后即时刷新。
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/profile');
    const data = res.ok ? await res.json().catch(() => null) : null;
    setProfile(data || null);
    return data;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
