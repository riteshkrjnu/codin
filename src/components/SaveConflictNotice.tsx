import { useEffect, useState } from 'react';
export default function SaveConflictNotice() {
  const [message,setMessage] = useState('');
  useEffect(() => { const listener = (event: Event) => setMessage((event as CustomEvent).detail); window.addEventListener('codin-save-conflict',listener); return () => window.removeEventListener('codin-save-conflict',listener); },[]);
  return message ? <aside role="alert" className="fixed bottom-4 left-4 right-4 z-[999] bg-white text-black border-2 border-red-700 p-5 shadow-lg"><strong>Changes were not saved.</strong><p>{message}</p><p>Your editor stays open. Copy any unsaved text before refreshing.</p><button type="button" className="underline mt-2" onClick={()=>setMessage('')}>Keep editing</button></aside> : null;
}
