export const categoryDefaults=['Articles','Reports','White Papers','Field Notes','Results','Photo Essays','Recordings','Podcasts'];
export const blockTypes=['paragraph','heading','list','quote','image','gallery','audio','video','youtube'];
export function validHttp(value:any){return typeof value==='string'&&/^https?:\/\//i.test(value)&&(()=>{try{return !new URL(value).username&&!new URL(value).password;}catch{return false;}})();}
export function validateDocument(value:any){
 if(!value||value.version!==1||!Array.isArray(value.blocks)||value.blocks.length>300)throw new Error('Invalid block document');
 const ids=new Set<string>();
 for(const b of value.blocks){
  if(!b||!blockTypes.includes(b.type)||typeof b.id!=='string'||!b.id||b.id.length>100||ids.has(b.id))throw new Error('Invalid content block');
  ids.add(b.id);
  for(const field of ['text','caption','alt','transcript','attribution'])if(b[field]!==undefined&&(typeof b[field]!=='string'||b[field].length>100000))throw new Error('Invalid block text');
  if(['image','audio','video','youtube'].includes(b.type)&&!validHttp(b.url))throw new Error('Use a complete HTTPS or HTTP media URL');
  if(b.type==='youtube'&&!['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(new URL(b.url).hostname))throw new Error('Use a YouTube URL for this block');
  if(b.type==='gallery'&&(!Array.isArray(b.images)||b.images.length>50||b.images.some((i:any)=>!validHttp(i.url)||typeof i.alt!=='string')))throw new Error('Invalid gallery images');
 }
 return {version:1,blocks:value.blocks.map((b:any)=>Object.fromEntries(['id','type','text','url','caption','alt','transcript','attribution','images'].filter(k=>b[k]!==undefined).map(k=>[k,k==='images'?b.images.map((i:any)=>({url:i.url,alt:i.alt,caption:typeof i.caption==='string'?i.caption:''})):b[k]])))};
}
export function mayManageSharing(user:any,resource:any){return !!user?._id&&(['admin','superadmin'].includes(user.role)||!!resource.createdBy&&String(resource.createdBy)===String(user._id));}
export function mayEdit(user:any,resource:any){return mayManageSharing(user,resource)||!!user?._id&&(resource.collaboratorIds||[]).some((id:any)=>String(id)===String(user._id));}
