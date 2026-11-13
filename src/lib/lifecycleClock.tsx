import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
const Clock = createContext(Date.now());
/** Refresh date-derived views while open, and immediately on returning to the tab. */
export function LifecycleClock({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('focus',update); document.removeEventListener('visibilitychange',update); };
  }, []);
  return <Clock.Provider value={now}>{children}</Clock.Provider>;
}
export const useLifecycleNow = () => useContext(Clock);
