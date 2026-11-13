/** Validate editorial responses before they can replace renderable workspace state. */
export async function editorialResponse<T>(response:Response,field:string,valid:(value:unknown)=>value is T,message:string):Promise<T>{
 if(!response.ok){const detail=response.status===404?'The running server does not provide this service (404).':response.status===401?'Please sign in again (401).':response.status===403?'Your account does not have access (403).':`The server returned HTTP ${response.status}.`;throw new Error(`${message} ${detail}`);}
 let body:any;try{body=await response.json();}catch{throw new Error(message);}
 if(!body||!valid(body[field]))throw new Error(message);
 return body[field];
}
export const categoryList=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(c=>typeof c==='string');
export const resourceRecord=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&typeof (value as any).slug==='string'&&typeof (value as any).title==='string';
export const resourceList=(value:unknown):value is Record<string,any>[]=>Array.isArray(value)&&value.every(r=>r&&typeof r==='object'&&typeof r.slug==='string'&&typeof r.title==='string');
export const revisionList=(value:unknown):value is Record<string,any>[]=>Array.isArray(value)&&value.every(r=>r&&typeof r==='object'&&Number.isInteger(r.revision));
export const homepageSelections=(value:unknown):value is Record<string,string[]>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string'));
