import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function EditorialDashboard() {
  const { user } = useAuth();
  const [report,setReport] = useState<any>(null);
  const [courses,setCourses] = useState<any[]>([]);
  const [selected,setSelected] = useState<any>(null);
  const [history,setHistory] = useState<any[]>([]);
  const [message,setMessage] = useState('');
  const load = async () => {
    const [r,c,e] = await Promise.all([fetch('/api/admin/editorial'),fetch('/api/lms/admin/courses'),fetch('/api/events')]);
    if (!r.ok || !c.ok || !e.ok) throw new Error('Could not load the editorial dashboard');
    setReport(await r.json()); setCourses([...(await c.json()).courses.map((x: any)=>({...x,kind:'courses'})),...(await e.json()).events.filter((x: any)=>!x.isCourse).map((x: any)=>({...x,kind:'events'}))]);
  };
  useEffect(()=>{if (user && ['admin','superadmin'].includes(user.role || '')) load().catch(e=>setMessage(e.message));},[user?.id]);
  if (!user || !['admin','superadmin'].includes(user.role || '')) return <div className="pt-32 p-8">Sign in as an administrator to manage publishing and revisions.</div>;
  async function choose(record: any) {
    setSelected(record); setHistory([]);
    const response = await fetch(`/api/${record.kind}/${record._id}/revisions`);
    const data = await response.json(); if (!response.ok) { setMessage(data.error); return; } setHistory(data.revisions);
  }
  async function restore(revision: any) {
    if (!confirm('Restore this revision? The current version will be preserved in history.')) return;
    const response = await fetch(`/api/${selected.kind}/${selected._id}/restore/${revision._id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({__v:selected.__v}) });
    const data = await response.json();
    if (!response.ok) {setMessage(data.error); return;}
    setMessage('Revision restored. The previous content remains in history.');
    await load(); await choose({...data.course,kind:selected.kind});
  }
  return <section className="max-w-6xl mx-auto pt-32 pb-20 px-6">
    <Link to="/admin" className="underline">← Administration</Link><h1 className="font-serif text-4xl my-6">Publishing & recovery</h1>
    {message && <p role="status" className="border p-4 my-4">{message}</p>}
    <div className="grid md:grid-cols-3 gap-6">{[['missingDates','Missing dates'],['awaitingReports','Completion reports needed'],['expiredNotices','Expired notices']].map(([key,title])=><article key={key} className="bg-white border p-5"><h2 className="text-xl font-bold mb-4">{title}</h2>{report ? report[key].length ? report[key].map((x: any)=><p className="py-2 border-t" key={String(x._id)}>{x.title}</p>):<p>All clear</p>:<p>Loading…</p>}</article>)}</div>
    <h2 className="text-2xl mt-12 mb-4">Activity revision history</h2><label>Choose an activity<select className="block bg-white border p-3 my-3 max-w-full" value={selected?._id || ''} onChange={e=>choose(courses.find(c=>String(c._id)===e.target.value))}><option value="">Select…</option>{courses.map(c=><option key={String(c._id)} value={String(c._id)}>{c.title}{c.deleted?' (trashed)':''}</option>)}</select></label>
    {selected && !history.length && <p>No revisions recorded yet.</p>}
    {history.map(h=><article key={h._id} className="flex flex-wrap gap-4 items-center justify-between border-b p-4 bg-white"><div>Revision {h.revision} · {h.action}<p>{new Date(h.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p></div><button className="border p-2" onClick={()=>restore(h)}>Restore revision</button></article>)}
  </section>;
}
