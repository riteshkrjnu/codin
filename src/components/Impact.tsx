import { useEffect, useState } from 'react';
export default function Impact() {
  const [data,setData] = useState<any>(null);
  useEffect(()=>{fetch('/api/impact').then(r=>r.ok?r.json():null).then(setData).catch(()=>{});},[]);
  if(!data)return null;
  return <section id="impact" className="py-16 px-6 lg:px-12 border-b border-ink bg-paper"><div className="max-w-6xl mx-auto"><h2 className="font-serif text-3xl mb-8">Our work in view</h2><div className="grid md:grid-cols-3 gap-8">{[['projects','Projects represented'],['programmes','Academy programmes listed'],['completedActivities','Completed activities']].map(([key,label])=><div key={key}><p className="font-serif text-6xl mb-3">{data[key]}</p><p>{label}</p></div>)}</div><p className="text-xs mt-6 opacity-70">Based on published records on this website · Updated {new Date(data.asOf).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</p></div></section>;
}
