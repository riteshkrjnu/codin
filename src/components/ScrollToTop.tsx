import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    // Lazy pages and live data can render anchor targets after navigation.
    let stop = false;
    const scroll = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) { target.scrollIntoView({ block: 'start' }); stop = true; observer.disconnect(); }
    };
    const observer = new MutationObserver(() => { if (!stop) scroll(); });
    observer.observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });
    scroll();
    return () => observer.disconnect();
  }, [pathname, hash]);
  return null;
}
