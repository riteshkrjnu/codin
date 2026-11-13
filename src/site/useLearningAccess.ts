import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/** Read the LMS permission decision; a preview or registration alone never grants access. */
export function useLearningAccess(slug?: string, registrationRevision?: string) {
  const {user}=useAuth(),token=user?.token,key=`${slug||''}:${token||''}`;
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{const update=()=>setRefresh(value=>value+1);window.addEventListener('focus',update);return()=>window.removeEventListener('focus',update);},[]);
  const [result,setResult]=useState({key:'',allowed:false,checked:false});
  useEffect(()=>{
    if(!slug||!token){setResult({key,allowed:false,checked:true});return;}
    const controller=new AbortController();
    setResult(previous=>previous.key===key?previous:{key,allowed:false,checked:false});
    fetch(`/api/courses/${encodeURIComponent(slug)}/access`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
      .then(async response=>response.ok?await response.json():{hasAccess:false})
      .then(body=>{if(!controller.signal.aborted)setResult({key,allowed:body.hasAccess===true,checked:true});})
      .catch(()=>{if(!controller.signal.aborted)setResult({key,allowed:false,checked:true});});
    return()=>controller.abort();
  },[slug,token,registrationRevision,refresh]);
  return result.key===key?result:{key,allowed:false,checked:!slug||!token};
}
